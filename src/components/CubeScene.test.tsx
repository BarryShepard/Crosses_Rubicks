import { act } from "react";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createGameState } from "../game/board";
import { CubeScene, createUndoRotationAnimation } from "./CubeScene";

vi.mock("@react-three/fiber", () => ({
  Canvas: (props: { "data-testid"?: string }) => <div data-testid={props["data-testid"]} />,
}));

vi.mock("@react-three/drei", () => ({
  Text: () => null,
}));

type TestListener = EventListenerOrEventListenerObject;

class TestNode {
  childNodes: TestNode[] = [];
  parentNode: TestNode | null = null;
  textContent = "";
  private listeners = new Map<string, Set<TestListener>>();

  constructor(
    readonly nodeType: number,
    readonly nodeName: string,
    readonly ownerDocument: TestDocument | null,
  ) {}

  appendChild<T extends TestNode>(node: T): T {
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore<T extends TestNode>(node: T, before: TestNode | null): T {
    node.parentNode = this;

    if (!before) {
      this.childNodes.push(node);
      return node;
    }

    const index = this.childNodes.indexOf(before);
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, node);
    return node;
  }

  removeChild<T extends TestNode>(node: T): T {
    this.childNodes = this.childNodes.filter((child) => child !== node);
    node.parentNode = null;
    return node;
  }

  addEventListener(type: string, listener: TestListener) {
    const listeners = this.listeners.get(type) ?? new Set<TestListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: TestListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    if (!("target" in event) || event.target === null) {
      Object.defineProperty(event, "target", { configurable: true, value: this });
    }

    Object.defineProperty(event, "currentTarget", { configurable: true, value: this });

    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === "function") {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    }

    if (event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }

    return !event.defaultPrevented;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
}

class TestElement extends TestNode {
  attributes = new Map<string, string>();
  className = "";
  namespaceURI = "http://www.w3.org/1999/xhtml";
  style: Record<string, string> = {};
  rect = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };

  constructor(
    readonly tagName: string,
    ownerDocument: TestDocument,
  ) {
    super(1, tagName.toUpperCase(), ownerDocument);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));

    if (name === "class") {
      this.className = String(value);
    }
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);

    if (name === "class") {
      this.className = "";
    }
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  closest(selector: string) {
    if (!selector.startsWith(".")) {
      return null;
    }

    const className = selector.slice(1);
    let current: TestNode | null = this;

    while (current) {
      if (current instanceof TestElement && current.className.split(/\s+/).includes(className)) {
        return current;
      }

      current = current.parentNode;
    }

    return null;
  }

  querySelector(selector: string): TestElement | null {
    if (selector.startsWith(".") && this.className.split(/\s+/).includes(selector.slice(1))) {
      return this;
    }

    for (const child of this.childNodes) {
      if (child instanceof TestElement) {
        const match = child.querySelector(selector);

        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  setPointerCapture() {}

  releasePointerCapture() {}
}

class TestDocument extends TestNode {
  defaultView: Window & typeof globalThis;
  documentElement: TestElement;
  body: TestElement;
  activeElement: TestElement;

  constructor() {
    super(9, "#document", null);
    this.defaultView = globalThis as Window & typeof globalThis;
    this.documentElement = new TestElement("html", this);
    this.body = new TestElement("body", this);
    this.activeElement = this.body;
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName: string) {
    return new TestElement(tagName, this);
  }

  createElementNS(_namespaceURI: string, tagName: string) {
    return new TestElement(tagName, this);
  }

  createTextNode(text: string) {
    const node = new TestNode(3, "#text", this);
    node.textContent = text;
    return node;
  }

  createComment(text: string) {
    const node = new TestNode(8, "#comment", this);
    node.textContent = text;
    return node;
  }
}

function installDomShim() {
  const document = new TestDocument();

  vi.stubGlobal("window", {
    document,
    HTMLElement: TestElement,
    HTMLIFrameElement: class HTMLIFrameElement extends TestElement {},
    Node: TestNode,
    Element: TestElement,
    Event,
    PointerEvent: Event,
    navigator: { userAgent: "vitest" },
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("HTMLElement", TestElement);
  vi.stubGlobal("HTMLIFrameElement", class HTMLIFrameElement extends TestElement {});
  vi.stubGlobal("Node", TestNode);
  vi.stubGlobal("Element", TestElement);
  vi.stubGlobal("PointerEvent", Event);
  vi.stubGlobal("navigator", { userAgent: "vitest" });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

  return document;
}

type PointerHandlers = {
  onPointerDown: (event: unknown) => void;
  onPointerMove: (event: unknown) => void;
  onPointerUp: (event: unknown) => void;
  onContextMenu: (event: unknown) => void;
};

function reactPropsFor(element: TestElement): PointerHandlers {
  const propsKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));

  if (!propsKey) {
    throw new Error("React props were not attached to the test element");
  }

  return (element as unknown as Record<string, PointerHandlers>)[propsKey];
}

function pointerEvent(target: TestElement, clientX: number, clientY: number, button = 0, buttons = 1) {
  return {
    button,
    buttons,
    clientX,
    clientY,
    currentTarget: target,
    pointerId: 1,
    preventDefault: vi.fn(),
    target,
  };
}

describe("CubeScene", () => {
  it("renders canvas and active-face placement controls", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        pendingRotation={null}
        undoRequestId={0}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
        onUndoRotationComplete={vi.fn()}
      />,
    );

    expect(html).toContain("cube-canvas");
    expect(html).toContain("Active face cells");
    expect(html).toContain("Place on row 1, column 1");
    expect(html).toContain("Place on row 3, column 3");
  });

  it("does not render legacy gesture rings", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        pendingRotation={null}
        undoRequestId={0}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
        onUndoRotationComplete={vi.fn()}
      />,
    );

    expect(html).not.toContain("z-gesture-rings");
  });

  it("exposes idle animation state for testable interaction transitions", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        pendingRotation={null}
        undoRequestId={0}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
        onUndoRotationComplete={vi.fn()}
      />,
    );

    expect(html).toContain('data-animation-state="idle"');
  });

  it("disables scene placement controls immediately when interactions are locked", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        interactionLocked
        pendingRotation={null}
        undoRequestId={0}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
        onUndoRotationComplete={vi.fn()}
      />,
    );

    expect(html.match(/disabled=""/g) ?? []).toHaveLength(9);
  });

  it("accepts pending undo animation props", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        pendingRotation={{ axis: "x", layerIndex: 1, direction: 1 }}
        undoRequestId={1}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
        onUndoRotationComplete={vi.fn()}
      />,
    );

    expect(html).toContain('data-animation-state="idle"');
  });

  it("uses the provided pending rotation direction for undo animation", () => {
    const undoRotation = { axis: "x", layerIndex: 1, direction: -1 } as const;
    const animation = createUndoRotationAnimation(undoRotation);

    expect(animation.preview.rotation).toEqual(undoRotation);
    expect(animation.targetAngle).toBeCloseTo(-Math.PI / 2);
  });

  it("commits a resolved rotation when pointerup happens before preview state exists", async () => {
    const document = installDomShim();
    const { createRoot } = await import("react-dom/client");
    const rafCallbacks: FrameRequestCallback[] = [];
    const onLayerRotation = vi.fn();
    let root: Root | null = null;

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(0);

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        root = createRoot(container as unknown as Element);
        root.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={null}
            undoRequestId={0}
            onPlaceMark={vi.fn()}
            onLayerRotation={onLayerRotation}
            onUndoRotationComplete={vi.fn()}
          />,
        );
      });

      const interactionLayer = container.querySelector(".cube-interaction-layer");
      expect(interactionLayer).not.toBeNull();
      interactionLayer!.rect = {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      act(() => {
        reactPropsFor(interactionLayer!).onPointerDown(
          pointerEvent(interactionLayer!, 150, 150, 2, 2),
        );
      });

      const draggedInteractionLayer = container.querySelector(".cube-interaction-layer");
      expect(draggedInteractionLayer).not.toBeNull();

      act(() => {
        reactPropsFor(draggedInteractionLayer!).onPointerUp(
          pointerEvent(draggedInteractionLayer!, 230, 150, 2, 0),
        );
      });

      expect(onLayerRotation).not.toHaveBeenCalled();
      expect(rafCallbacks).toHaveLength(1);

      act(() => {
        rafCallbacks[0](200);
      });

      expect(onLayerRotation).toHaveBeenCalledWith({
        axis: "y",
        layerIndex: 1,
        direction: 1,
      });
    } finally {
      act(() => {
        root?.unmount();
      });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("notifies animation lock changes around commit completion", async () => {
    const document = installDomShim();
    const { createRoot } = await import("react-dom/client");
    const rafCallbacks: FrameRequestCallback[] = [];
    const onLayerRotation = vi.fn();
    const onAnimationLockChange = vi.fn();
    let root: Root | null = null;

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(0);

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        root = createRoot(container as unknown as Element);
        root.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={null}
            undoRequestId={0}
            onPlaceMark={vi.fn()}
            onLayerRotation={onLayerRotation}
            onUndoRotationComplete={vi.fn()}
            onAnimationLockChange={onAnimationLockChange}
          />,
        );
      });

      const interactionLayer = container.querySelector(".cube-interaction-layer");
      expect(interactionLayer).not.toBeNull();
      interactionLayer!.rect = {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      act(() => {
        reactPropsFor(interactionLayer!).onPointerDown(
          pointerEvent(interactionLayer!, 150, 150, 2, 2),
        );
      });

      const draggedInteractionLayer = container.querySelector(".cube-interaction-layer");
      expect(draggedInteractionLayer).not.toBeNull();

      act(() => {
        reactPropsFor(draggedInteractionLayer!).onPointerUp(
          pointerEvent(draggedInteractionLayer!, 230, 150, 2, 0),
        );
      });

      expect(onAnimationLockChange).toHaveBeenCalledWith(true);
      expect(onLayerRotation).not.toHaveBeenCalled();

      act(() => {
        rafCallbacks[0](200);
      });

      expect(onLayerRotation).toHaveBeenCalledWith({
        axis: "y",
        layerIndex: 1,
        direction: 1,
      });
      const lastLockCall =
        onAnimationLockChange.mock.calls[onAnimationLockChange.mock.calls.length - 1];
      const lastLockOrder =
        onAnimationLockChange.mock.invocationCallOrder[
          onAnimationLockChange.mock.invocationCallOrder.length - 1
        ];
      expect(lastLockCall).toEqual([false]);
      expect(onLayerRotation.mock.invocationCallOrder[0]).toBeLessThan(
        lastLockOrder,
      );
    } finally {
      act(() => {
        root?.unmount();
      });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("does not commit a resolved rotation when the layer cannot rotate", async () => {
    const document = installDomShim();
    const { createRoot } = await import("react-dom/client");
    const rafCallbacks: FrameRequestCallback[] = [];
    const onLayerRotation = vi.fn();
    let root: Root | null = null;

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(0);

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        root = createRoot(container as unknown as Element);
        root.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={null}
            undoRequestId={0}
            canRotateLayer={() => false}
            onPlaceMark={vi.fn()}
            onLayerRotation={onLayerRotation}
            onUndoRotationComplete={vi.fn()}
          />,
        );
      });

      const interactionLayer = container.querySelector(".cube-interaction-layer");
      expect(interactionLayer).not.toBeNull();
      interactionLayer!.rect = {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      act(() => {
        reactPropsFor(interactionLayer!).onPointerDown(
          pointerEvent(interactionLayer!, 150, 150, 2, 2),
        );
      });

      const draggedInteractionLayer = container.querySelector(".cube-interaction-layer");
      expect(draggedInteractionLayer).not.toBeNull();

      act(() => {
        reactPropsFor(draggedInteractionLayer!).onPointerUp(
          pointerEvent(draggedInteractionLayer!, 230, 150, 2, 0),
        );
      });

      expect(onLayerRotation).toHaveBeenCalledTimes(1);
      expect(onLayerRotation).toHaveBeenCalledWith(null);
      expect(onLayerRotation).not.toHaveBeenCalledWith({
        axis: "y",
        layerIndex: 1,
        direction: 1,
      });
      expect(rafCallbacks).toHaveLength(0);
    } finally {
      act(() => {
        root?.unmount();
      });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("completes pending undo only after a new undo request animation finishes", async () => {
    const document = installDomShim();
    const { createRoot } = await import("react-dom/client");
    const rafCallbacks: FrameRequestCallback[] = [];
    const onUndoRotationComplete = vi.fn();
    let root: Root | null = null;

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(0);

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        root = createRoot(container as unknown as Element);
        root.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={{ axis: "x", layerIndex: 1, direction: 1 }}
            undoRequestId={0}
            onPlaceMark={vi.fn()}
            onLayerRotation={vi.fn()}
            onUndoRotationComplete={onUndoRotationComplete}
          />,
        );
      });

      expect(onUndoRotationComplete).not.toHaveBeenCalled();
      expect(rafCallbacks).toHaveLength(0);

      act(() => {
        root!.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={{ axis: "x", layerIndex: 1, direction: 1 }}
            undoRequestId={1}
            onPlaceMark={vi.fn()}
            onLayerRotation={vi.fn()}
            onUndoRotationComplete={onUndoRotationComplete}
          />,
        );
      });

      expect(onUndoRotationComplete).not.toHaveBeenCalled();
      expect(rafCallbacks).toHaveLength(1);

      act(() => {
        rafCallbacks[0](200);
      });

      expect(onUndoRotationComplete).toHaveBeenCalledTimes(1);
    } finally {
      act(() => {
        root?.unmount();
      });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("does not rotate from a left-button drag", async () => {
    const document = installDomShim();
    const { createRoot } = await import("react-dom/client");
    const onLayerRotation = vi.fn();
    let root: Root | null = null;

    vi.stubGlobal("requestAnimationFrame", vi.fn());
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        root = createRoot(container as unknown as Element);
        root.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={null}
            undoRequestId={0}
            onPlaceMark={vi.fn()}
            onLayerRotation={onLayerRotation}
            onUndoRotationComplete={vi.fn()}
          />,
        );
      });

      const interactionLayer = container.querySelector(".cube-interaction-layer");
      expect(interactionLayer).not.toBeNull();
      interactionLayer!.rect = {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      act(() => {
        reactPropsFor(interactionLayer!).onPointerDown(pointerEvent(interactionLayer!, 150, 150));
      });

      const draggedInteractionLayer = container.querySelector(".cube-interaction-layer");
      expect(draggedInteractionLayer).not.toBeNull();

      act(() => {
        reactPropsFor(draggedInteractionLayer!).onPointerMove(
          pointerEvent(draggedInteractionLayer!, 230, 150),
        );
        reactPropsFor(draggedInteractionLayer!).onPointerUp(
          pointerEvent(draggedInteractionLayer!, 230, 150, 0, 0),
        );
      });

      expect(onLayerRotation).not.toHaveBeenCalled();
    } finally {
      act(() => {
        root?.unmount();
      });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("starts right-button rotation over active face cells", async () => {
    const document = installDomShim();
    const { createRoot } = await import("react-dom/client");
    const rafCallbacks: FrameRequestCallback[] = [];
    const onLayerRotation = vi.fn();
    let root: Root | null = null;

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(0);

    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      act(() => {
        root = createRoot(container as unknown as Element);
        root.render(
          <CubeScene
            game={createGameState()}
            pendingRotation={null}
            undoRequestId={0}
            onPlaceMark={vi.fn()}
            onLayerRotation={onLayerRotation}
            onUndoRotationComplete={vi.fn()}
          />,
        );
      });

      const interactionLayer = container.querySelector(".cube-interaction-layer");
      const activeFaceCell = container.querySelector(".active-face-cell");
      expect(interactionLayer).not.toBeNull();
      expect(activeFaceCell).not.toBeNull();
      interactionLayer!.rect = {
        left: 0,
        top: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      act(() => {
        reactPropsFor(interactionLayer!).onPointerDown({
          ...pointerEvent(activeFaceCell!, 150, 150, 2, 2),
          currentTarget: interactionLayer,
        });
      });

      const draggedInteractionLayer = container.querySelector(".cube-interaction-layer");
      expect(draggedInteractionLayer).not.toBeNull();

      act(() => {
        reactPropsFor(draggedInteractionLayer!).onPointerUp(
          pointerEvent(draggedInteractionLayer!, 230, 150, 2, 0),
        );
      });

      expect(rafCallbacks).toHaveLength(1);

      act(() => {
        rafCallbacks[0](200);
      });

      expect(onLayerRotation).toHaveBeenCalledWith({
        axis: "y",
        layerIndex: 1,
        direction: 1,
      });
    } finally {
      act(() => {
        root?.unmount();
      });
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
