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
    { name: 'main.py', content: '' },
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
        <button
          onClick={runCode}
          disabled={!pyodide}
          title="Run code (Ctrl+R)"
        >
          ▶
        </button>
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
