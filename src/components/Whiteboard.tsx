import { produce } from "immer";
import React from "react";
import { Canvas, CanvasPath, Point } from "react-sketch-canvas";
import ReactTooltip from "react-tooltip";
import { getsocketIoInstance } from '../utils/socketio-client';

/* Default settings */

const defaultProps = {
  width: "100%",
  height: "100%",
  className: "",
  canvasColor: "white",
  strokeColor: "red",
  background: "",
  strokeWidth: 4,
  eraserWidth: 20,
  allowOnlyPointerType: "all",
  style: {
    border: "0.0625rem solid #9c9c9c",
    borderRadius: "0.25rem",
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onUpdate: (_: CanvasPath[]): void => { },
  withTimestamp: false,
};

/* Props validation */

export type ReactSketchCanvasProps = {
  width: string;
  height: string;
  className: string;
  strokeColor: string;
  canvasColor: string;
  background: string;
  strokeWidth: number;
  eraserWidth: number;
  allowOnlyPointerType: string;
  onUpdate: (updatedPaths: CanvasPath[]) => void;
  style: React.CSSProperties;
  withTimestamp: boolean;
};

export type ReactSketchCanvasStates = {
  drawMode: boolean;
  isDrawing: boolean;
  resetStack: CanvasPath[];
  undoStack: CanvasPath[];
  currentPaths: CanvasPath[];
  eraseMode: boolean;
};

export class Whiteboard extends React.Component<
  ReactSketchCanvasProps,
  ReactSketchCanvasStates
  > {
  static defaultProps = defaultProps;

  svgCanvas: React.RefObject<Canvas>;

  initialState = {
    drawMode: true,
    isDrawing: false,
    // eslint-disable-next-line react/no-unused-state
    resetStack: [],
    undoStack: [],
    currentPaths: [],
    eraseMode: false,
  };
  roomName: string | null;
  socketIo: any;
  displayName: string | null;

  constructor(props: ReactSketchCanvasProps) {
    super(props);

    this.state = this.initialState;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.eraseMode = this.eraseMode.bind(this);
    this.clearCanvas = this.clearCanvas.bind(this);
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
    this.resetCanvas = this.resetCanvas.bind(this);

    this.liftPathsUp = this.liftPathsUp.bind(this);

    this.svgCanvas = React.createRef();

    this.roomName = sessionStorage.getItem('roomName');
    this.displayName = sessionStorage.getItem('displayName');
    this.socketIo = getsocketIoInstance(this.roomName, this.displayName, 'Whiteboard');
  }

  componentDidMount() {
    this.socketIo.on('whiteboard-paths', ({ currentPaths, isDrawing }: { currentPaths: CanvasPath[]; isDrawing: boolean; }) => {
      // update paths
      this.setState({
        // currentPaths: fromJS(currentPaths),
        currentPaths,
        isDrawing
      });
    });

    // this.socketIo.on('sketch-undo', () => {
    //   this.undo();
    // });
    // this.socketIo.on('sketch-redo', () => {
    //   this.redo();
    // });
    // this.socketIo.on('sketch-clear', () => {
    //   // this.clearCanvas();
    //   this.resetCanvas();
    // });
  }

  resetCanvas(): void {
    this.setState(this.initialState);
  }

  liftPathsUp(): void {
    const { currentPaths } = this.state;
    const { onUpdate } = this.props;

    onUpdate(currentPaths);
  }

  /* Mouse Handlers - Mouse down, move and up */

  handlePointerDown(point: Point): void {
    this.socketIo.emit("sketchPointerDown", { roomName: this.roomName, point, toDraw: !this.state.eraseMode });
  }

  handlePointerMove(point: Point): void {
    this.socketIo.emit("sketchPointerMove", { roomName: this.roomName, point, toDraw: !this.state.eraseMode });
  }

  handlePointerUp(): void {
    this.socketIo.emit("sketchPointerUp", { roomName: this.roomName });
  }

  /* Mouse Handlers ends */

  /* Canvas operations */

  eraseMode(erase: boolean): void {
    this.setState(
      produce((draft: ReactSketchCanvasStates) => {
        draft.drawMode = !erase;
      }),
      this.liftPathsUp
    );
  }
  toggleEraseMode = () => {
    this.eraseMode(!this.state.eraseMode);
    this.setState({ eraseMode: !this.state.eraseMode })
  }

  clearCanvas(): void {
    this.setState(
      produce((draft: ReactSketchCanvasStates) => {
        draft.resetStack = draft.currentPaths;
        draft.currentPaths = [];
      }),
      this.liftPathsUp
    );
    this.socketIo.emit("sketch-clear", { roomName: this.roomName });
  }

  undo(): void {
    const { resetStack } = this.state;

    // If there was a last reset then
    if (resetStack.length !== 0) {
      this.setState(
        produce((draft: ReactSketchCanvasStates) => {
          draft.currentPaths = draft.resetStack;
          draft.resetStack = [];
        }),
        () => {
          const { currentPaths } = this.state;
          const { onUpdate } = this.props;

          onUpdate(currentPaths);
        }
      );
      this.socketIo.emit("sketch-undo", { roomName: this.roomName });
      return;
    }

    this.setState(
      produce((draft: ReactSketchCanvasStates) => {
        const lastSketchPath = draft.currentPaths.pop();

        if (lastSketchPath) {
          draft.undoStack.push(lastSketchPath);
        }
      }),
      this.liftPathsUp
    );
    this.socketIo.emit("sketch-undo", { roomName: this.roomName });
  }

  redo(): void {
    const { undoStack } = this.state;

    // Nothing to Redo
    if (undoStack.length === 0) return;

    this.setState(
      produce((draft: ReactSketchCanvasStates) => {
        const lastUndoPath = draft.undoStack.pop();

        if (lastUndoPath) {
          draft.currentPaths.push(lastUndoPath);
        }
      }),
      this.liftPathsUp
    );
    this.socketIo.emit("sketch-redo", { roomName: this.roomName });
  }

  /* Finally!!! Render method */

  render(): JSX.Element {
    const {
      width,
      height,
      className,
      canvasColor,
      background,
      style,
      allowOnlyPointerType,
    } = this.props;

    const { currentPaths, isDrawing } = this.state;

    return (
      <div className="whiteboard">
        <h4>Whiteboard</h4>
        {/* <h4>Doodle</h4> */}
        <ReactTooltip id="whtbrd-tltp" place="top" type="info" effect="float" />
        <div className="whiteboard-icons">
          {/* <i className="fas fa-undo" data-tip='Undo' onClick={this.undo} data-for="whtbrd-tltp"></i>
          <i className="fas fa-redo" data-tip='Redo' onClick={this.redo} data-for="whtbrd-tltp"></i> */}
          <i className="fas fa-eraser" data-tip={this.state.eraseMode ? 'Stop Erase' : 'Erase'}
            onClick={this.toggleEraseMode} data-for="whtbrd-tltp"></i>
          <i className="fas fa-broom" data-tip='Clear' onClick={this.clearCanvas} data-for="whtbrd-tltp"></i>
        </div>
        <Canvas
          ref={this.svgCanvas}
          width={width}
          height={height}
          className={className}
          canvasColor={canvasColor}
          background={background}
          allowOnlyPointerType={allowOnlyPointerType}
          style={style}
          paths={currentPaths}
          isDrawing={isDrawing}
          onPointerDown={this.handlePointerDown}
          onPointerMove={this.handlePointerMove}
          onPointerUp={this.handlePointerUp}
        />
      </div>
    );
  }
}