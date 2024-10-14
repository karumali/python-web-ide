import React, { useEffect, useState } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor';
import { Pyodide } from './types/pyodide';

type File = {
  name: string;
  content: string;
};

const App: React.FC = () => {
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const [files, setFiles] = useState<File[]>([
    { name: 'main.py', content: 'print("Hello World!")' },
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(parseInt(localStorage.getItem('activeFileIndex') || '0'));
  const [output, setOutput] = useState<string>('');
  const [isOutputVisible, setIsOutputVisible] = useState<boolean>(false);

  useEffect(() => {
    const savedFiles = localStorage.getItem('files');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      setFiles(parsedFiles);
    }
  }, []);

  useEffect(() => {
    if (files[activeFileIndex]) {
      document.title = files[activeFileIndex].name + " - Python Web IDE";
    }
  }, [files, activeFileIndex]);

  useEffect(() => {
    localStorage['activeFileIndex'] = activeFileIndex;
  }, [activeFileIndex]);

  useEffect(() => {
    const loadPyodide = async () => {
      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      });
      // const pyodide = await window.loadPyodide({
      //   indexURL: '/pyodide/',
      // });
      setPyodide(pyodide);
    };
    loadPyodide();
  }, []);

  const runCode = async () => {
    if (!pyodide) return;

    try {
      // Write files to Pyodide FS
      files.forEach((file) => {
        pyodide.FS.writeFile(file.name, file.content);
      });

      // Capture stdout
      await pyodide.runPythonAsync(`
        import sys
        from io import StringIO
        sys.stdout = StringIO()
      `);

      // Run the active file
      await pyodide.runPythonAsync(`
        exec(open('${files[activeFileIndex].name}').read())
      `);

      // Get stdout content
      const stdout = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      setOutput(stdout);
      setIsOutputVisible(true);
    } catch (err: any) {
      setOutput(`[ERROR] ${err.message}`);
      setIsOutputVisible(true);
    }
  };


  const closeFile = (index: number) => {
    if (files.length === 1) {
      alert('Cannot close the last remaining file.');
      return;
    }

    const updatedFiles = files.filter((_, i) => i !== index);

    // Update active file index
    let newActiveFileIndex = activeFileIndex;

    if (index === activeFileIndex) {
      newActiveFileIndex = index > 0 ? index - 1 : 0;
    } else if (index < activeFileIndex) {
      newActiveFileIndex = activeFileIndex - 1;
    }

    setFiles(updatedFiles);
    setActiveFileIndex(newActiveFileIndex);
    localStorage.setItem('files', JSON.stringify(updatedFiles));
  };

  const newFile = () => {
    const name = prompt('Enter new file name');
    if (name) {
      const updatedFiles = [...files, { name, content: '' }];
      setFiles(updatedFiles);
      setActiveFileIndex(updatedFiles.length - 1);
      localStorage.setItem('files', JSON.stringify(updatedFiles));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        runCode();
      }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        setActiveFileIndex(parseInt(e.key) - 1);
      }
      if (e.metaKey && e.key === 'j') {
        e.preventDefault();
        setIsOutputVisible(!isOutputVisible);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCode]);

  return (
    <div className="workspace">
      <div className="tabs">
        {files.map((file, index) => (
          <div
            key={index}
            className={`tab ${activeFileIndex === index ? 'active' : ''}`}
          >
            <span onClick={() => setActiveFileIndex(index)}>{file.name}</span>
            <button className="close-button" onClick={() => closeFile(index)}>
              ×
            </button>
          </div>
        ))}
        <button
          title="New File (Ctrl+N)"
          onClick={newFile}
        >
          +
        </button>
        <span className="new-file-button-after" />
        <button
          onClick={runCode}
          disabled={!pyodide}
          title="Run code (Ctrl+R)"
        >
          ▶
        </button>
        <a
          href="https://github.com/karumali/python-web-ide"
          target="_blank"
          rel="noopener noreferrer"
          className="github-button"
          title="About this project"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0.297C5.372 0.297 0 5.669 0 12.297c0 5.303 3.438 9.8 8.207 11.387.6.11.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.389-1.333-1.759-1.333-1.759-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.236 1.84 1.236 1.07 1.832 2.809 1.303 3.495.996.108-.775.42-1.303.762-1.603-2.665-.303-5.466-1.333-5.466-5.93 0-1.31.469-2.381 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.301 1.23a11.52 11.52 0 013.005-.404c1.02.005 2.045.138 3.005.404 2.29-1.553 3.295-1.23 3.295-1.23.655 1.653.244 2.874.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.806 5.624-5.479 5.921.431.372.815 1.103.815 2.222v3.293c0 .319.192.694.801.576C20.565 22.092 24 17.596 24 12.297 24 5.669 18.627 0.297 12 0.297z" />
          </svg>
        </a>
      </div>
      {pyodide &&
        <div className="code-container">
          <CodeEditor
            code={files[activeFileIndex].content}
            onChange={(value) => {
              const updatedFiles = [...files];
              updatedFiles[activeFileIndex].content = value || '';
              setFiles(updatedFiles);
              localStorage.setItem('files', JSON.stringify(updatedFiles));
            }}
          />
        </div>
      }
      {!pyodide && <div className="loading-pyodide"> Initializing Pyodide... </div>}

      {isOutputVisible && (
        <div className="output-panel">
          <div className="output-header">
            <span>Output</span>
            <button
              className="close-output-button"
              onClick={() => setIsOutputVisible(false)}
              title="Close"
            >
              ×
            </button>
          </div>
          <pre className="output-content">{output}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
