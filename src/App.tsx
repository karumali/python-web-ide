import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import CodeEditor from './components/CodeEditor';
import { auth, db, provider } from './firebaseConfig';
import { Pyodide } from './types/pyodide';
import { Button, createTheme, Menu, MenuItem, Slider, Switch, ThemeProvider, Tooltip } from '@mui/material';


type File = {
  id: string;
  name: string;
  content: string;
  lastupdatedutc: string;
};

const App: React.FC = () => {
  const defaultFile: File = {
    id: uuidv4(),
    name: 'main.py',
    content: 'print("Hello World!")',
    lastupdatedutc: new Date().toISOString()
  };

  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const [files, setFilesState] = useState<File[]>([defaultFile]);
  const [activeFileId, setActiveFileId] = useState<string>(
    localStorage.getItem('activeFileId') || defaultFile.id
  );
  const [output, setOutput] = useState<string>('');
  const [isOutputVisible, setIsOutputVisible] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isVimMode, setIsVimMode] = useState<boolean>(localStorage.getItem('isVimMode') === 'true');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('isDarkMode') === 'true');
  const [fontSize, setFontSize] = useState<number>(localStorage.getItem('fontSize') ? parseInt(localStorage.getItem('fontSize')!) : 14);
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });
  const setFiles = (files: File[]) => {
    files = files.map(x => ({
      ...x,
      id: x.id ? x.id : uuidv4()
    }))
    setFilesState(files);
  };

  useEffect(() => {
    const savedFiles = localStorage.getItem('files');
    if (savedFiles) {
      let parsedFiles = JSON.parse(savedFiles) as File[];
      parsedFiles = parsedFiles.map(x => ({
        ...x,
        id: x.id ? x.id : uuidv4()
      }))
      parsedFiles.sort((a, b) => new Date(b.lastupdatedutc).getTime() - new Date(a.lastupdatedutc).getTime());
      setFiles(parsedFiles);
    }
  }, []);

  useEffect(() => {
    const activeFile = files.find((file) => file.id === activeFileId);
    if (activeFile) {
      document.title = `${activeFile.name} - Python Web IDE`;
    }
  }, [files, activeFileId]);

  useEffect(() => {
    localStorage.setItem('activeFileId', activeFileId);
  }, [activeFileId]);


  useEffect(() => {
    const loadPyodide = async () => {
      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
        stdin: window.prompt,
      });
      // const pyodide = await window.loadPyodide({
      //   indexURL: '/pyodide/',
      // });
      await pyodide.loadPackage(["numpy"]);
      setPyodide(pyodide);
    };
    loadPyodide();
  }, []);

  useEffect(() => {
    localStorage.setItem('isVimMode', isVimMode.toString());
  }, [isVimMode]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

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
        from js import prompt
        __builtins__.input = prompt
      `);
      const activeFile = files.find((file) => file.id === activeFileId);
      if (!activeFile) return;
      // Run the active file
      await pyodide.runPythonAsync(`
        exec(open('${activeFile.name}').read())
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

  const closeFile = (id: string) => {
    if (files.length === 1) {
      alert('Cannot close the last remaining file.');
      return;
    }
    const file = files.find(x => x.id === id);
    if (!file || !window.confirm(`Are you sure to delete ${file.name} ?`)) return;

    const updatedFiles = files.filter((file) => file.id !== id);

    if (id === activeFileId) {
      setActiveFileId(updatedFiles[0].id);
    }

    setFiles(updatedFiles);
    localStorage.setItem('files', JSON.stringify(updatedFiles));
    saveUserData(updatedFiles);
  };

  const newFile = () => {
    const name = prompt('Enter new file name');
    if (name) {
      const newFile: File = {
        id: uuidv4(),
        name,
        content: '',
        lastupdatedutc: new Date().toISOString()
      };
      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      setActiveFileId(newFile.id);
      saveUserData(updatedFiles);
      localStorage.setItem('files', JSON.stringify(updatedFiles));
    }
  };

  const handleCloudUpdate = (cloudFiles: File[]) => {
    const localFilesById = new Map(files.filter(x => x.name !== defaultFile.name || x.content !== defaultFile.content).map((file) => [file.id, file]));

    const mergedFiles = cloudFiles.map((cloudFile) => {
      const localFile = localFilesById.get(cloudFile.id);

      if (localFile) {
        // Both local and cloud versions exist
        const localTimestamp = new Date(localFile.lastupdatedutc).getTime();
        const cloudTimestamp = new Date(cloudFile.lastupdatedutc).getTime();

        if (cloudTimestamp > localTimestamp) {
          // Cloud version is newer
          return cloudFile;
        } else {
          // Local version is newer or timestamps are equal
          return localFile;
        }
      } else {
        // New file from cloud
        return cloudFile;
      }
    });

    // Add any local files not present in cloud
    cloudFiles.forEach((cloudFile) => localFilesById.delete(cloudFile.id));
    const remainingLocalFiles = Array.from(localFilesById.values());
    let allFiles = [...mergedFiles, ...remainingLocalFiles];
    if (allFiles.length === 0) {
      allFiles = [defaultFile];
    }

    setFiles(allFiles);
    localStorage.setItem('files', JSON.stringify(allFiles));
  }

  const fetchUserData = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.files) {
        const cloudFiles = data.files as File[];
        cloudFiles.sort((a, b) => new Date(b.lastupdatedutc).getTime() - new Date(a.lastupdatedutc).getTime());
        handleCloudUpdate(cloudFiles);
      }
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
        const index = parseInt(e.key) - 1;
        if (files[index]) {
          setActiveFileId(files[index].id);
        }
      }
      if (e.metaKey && e.key === 'j') {
        e.preventDefault();
        setIsOutputVisible(!isOutputVisible);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newFile();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOutputVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCode, files, activeFileId, isOutputVisible]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        fetchUserData(currentUser.uid);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    let unsubscribe: () => void = () => { };

    const initAuthListener = async () => {
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          // Set up real-time listener
          const docRef = doc(db, 'users', currentUser.uid);

          unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const cloudFiles = data.files as File[];
              handleCloudUpdate(cloudFiles);
            }
          });
        } else {
          unsubscribe();
        }
      });
    };

    initAuthListener();

    return () => {
      // Clean up on component unmount
      unsubscribe();
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
    handleUserMenuClose();
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFiles([defaultFile]);
      setActiveFileId(defaultFile.id);
      localStorage.removeItem('files');
      localStorage.removeItem('activeFileId');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleUserMenuClose();
  };

  const saveUserData = useCallback(async (files: File[]) => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          files,
          activeFileId,
        });
      } catch (error) {
        console.error('Error saving data:', error);
      }
    }
  }, [user, files, activeFileId]);

  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    let initials = names[0].charAt(0);
    if (names.length > 1) {
      initials += names[names.length - 1].charAt(0);
    } else if (names[0].length >= 2) {
      initials += names[0].charAt(1);
    }
    return initials.toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 60%)`;
    return color;
  };

  const defaultUserIcon = <svg
    xmlns="http://www.w3.org/2000/svg"
    width="33"
    height="33"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 12c2.7614 0 5 2.2386 5 5v1H7v-1c0-2.7614 2.2386-5 5-5zm0-2c-1.6569 0-3-1.3431-3-3s1.3431-3 3-3 3 1.3431 3 3-1.3431 3-3 3z" />
  </svg>;

  const activeFile = files.find((file) => file.id === activeFileId);

  const copyToClipboard = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content).then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const userMenuOpen = Boolean(userMenuAnchorEl);

  const getEditor = useCallback((isVimMode: boolean) => {
    return <CodeEditor
      code={activeFile ? activeFile.content : ""}
      isVimMode={isVimMode}
      isDarkMode={isDarkMode}
      fontSize={fontSize}
      onChange={(value) => {
        const updatedFiles = files.map((file) =>
          file.id === activeFileId
            ? { ...file, content: value ? value : "", lastupdatedutc: new Date().toISOString() }
            : file
        );
        setFiles(updatedFiles);
        localStorage.setItem('files', JSON.stringify(updatedFiles));
        saveUserData(updatedFiles);
      }}
    />
  }, [activeFileId, files, saveUserData, isDarkMode, fontSize]);

  return (
    <ThemeProvider theme={theme}>
      <div className={`workspace ${isDarkMode ? '' : 'light'}`}>
        <div className="tabs">
          <div className="file-tabs">
            {files.map((file, index) => (
              <div
                key={index}
                className={`tab ${activeFileId === file.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveFileId(file.id);
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) { // Middle click
                    closeFile(file.id);
                  }
                }}
              >
                <span>{file.name}</span>
                <button className="close-button" onClick={(e) => {
                  closeFile(file.id);
                  e.stopPropagation();
                }}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            title="New File (Ctrl+N)"
            onClick={newFile}
          >
            +
          </button>
          <span className="new-file-button-after" />
          <Tooltip title="Run code (Ctrl+R)" placement="bottom" arrow>
            <button
              onClick={runCode}
              disabled={!pyodide}
            >
              ▶
            </button>
          </Tooltip>
          {/* <a
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
        </a> */}
          <Tooltip title={isCopied ? "Copied" : "Copy code to clipboard"} placement="bottom" arrow>
            <button
              onClick={copyToClipboard}
              className={"copy-button"}
            >
              <svg width="22px" height="22px" viewBox="0 0 24 24" fill={isCopied ? "none" : "currentColor"} xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5.00005C7.01165 5.00082 6.49359 5.01338 6.09202 5.21799C5.71569 5.40973 5.40973 5.71569 5.21799 6.09202C5 6.51984 5 7.07989 5 8.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.07989 21 8.2 21H15.8C16.9201 21 17.4802 21 17.908 20.782C18.2843 20.5903 18.5903 20.2843 18.782 19.908C19 19.4802 19 18.9201 19 17.8V8.2C19 7.07989 19 6.51984 18.782 6.09202C18.5903 5.71569 18.2843 5.40973 17.908 5.21799C17.5064 5.01338 16.9884 5.00082 16 5.00005M8 5.00005V7H16V5.00005M8 5.00005V4.70711C8 4.25435 8.17986 3.82014 8.5 3.5C8.82014 3.17986 9.25435 3 9.70711 3H14.2929C14.7456 3 15.1799 3.17986 15.5 3.5C15.8201 3.82014 16 4.25435 16 4.70711V5.00005"
                  stroke="currentColor" stroke-width={isCopied ? "2" : "0"} stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </Tooltip>
          {user ? (
            <Button className="logout-button" onClick={handleUserMenuOpen}>
              <div
                className="avatar"
                style={{ backgroundColor: getAvatarColor(user.displayName || user.email || 'User') }}
              >
                {getInitials(user.displayName || user.email || 'User')}
              </div>
            </Button>
          ) : (
            <Button className="login-button" onClick={handleUserMenuOpen}>
              {defaultUserIcon}
            </Button>
          )}
          <Menu
            id="user-menu"
            anchorEl={userMenuAnchorEl}
            open={userMenuOpen}
            onClose={handleUserMenuClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            <MenuItem onClick={() => setIsVimMode(!isVimMode)}>
              Vim Mode
              <Switch checked={isVimMode} />
            </MenuItem>
            <MenuItem onClick={() => setIsDarkMode(!isDarkMode)}>
              Dark Mode
              <Switch checked={isDarkMode} />
            </MenuItem>
            <MenuItem style={{ display: 'contents' }}>
              <Button onClick={() => setFontSize(fontSize - 1)}>-</Button>
              Font Size
              <Button onClick={() => setFontSize(fontSize + 1)}>+</Button>
            </MenuItem>
            <MenuItem onClick={() => window.open('https://github.com/karumali/python-web-ide', '_blank')}>
              About this project
            </MenuItem>
            {
              user && <MenuItem onClick={logout}>
                Logout
              </MenuItem>
            }
            {
              !user && <Tooltip title="Login to save your files to the cloud" placement="left" arrow>
                <MenuItem onClick={login}>
                  Login
                </MenuItem>
              </Tooltip>
            }
          </Menu>
        </div>
        {pyodide &&
          <div className="code-container">
            {isVimMode && getEditor(true)}
            {!isVimMode && getEditor(false)}
          </div>
        }
        {!pyodide && (
          <div className="loading-pyodide">
            <div className="spinner"></div>
            <div className="loading-text">Initializing Runtime...</div>
          </div>
        )}


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
    </ThemeProvider>
  );
};

export default App;
