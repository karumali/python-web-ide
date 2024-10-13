declare global {
  interface Window {
    loadPyodide: (config?: { indexURL: string }) => Promise<Pyodide>;
    pyodide?: Pyodide;
  }
}

export interface Pyodide {
  runPythonAsync: (code: string) => Promise<any>;
  FS: {
    writeFile: (path: string, data: string) => void;
  };
}
