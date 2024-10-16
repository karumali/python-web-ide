declare global {
  interface Window {
    loadPyodide: (config?: {
      indexURL: string;
      stdin: () =>
        | null
        | undefined
        | string
        | ArrayBuffer
        | Uint8Array
        | number;
    }) => Promise<Pyodide>;
    pyodide?: Pyodide;
  }
}

export interface Pyodide {
  runPythonAsync: (code: string) => Promise<any>;
  FS: {
    writeFile: (path: string, data: string) => void;
  };
}
