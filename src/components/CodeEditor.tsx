import Editor from '@monaco-editor/react';
import React, { useEffect, useState } from 'react';
import { setTheme } from './Themes';
import { registerCompletion } from 'monacopilot';
import { COMPLETION_ENDPOINT } from '../constants';

type CodeEditorProps = {
  code: string;
  onChange: (value: string | undefined) => void;
  isVimMode: boolean;
  isDarkMode: boolean;
  fontSize: number;
  useCopilot: boolean;
  filename: string;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, isVimMode, isDarkMode, fontSize, useCopilot, filename }) => {
  const [monacoVim, setMonacoVim] = useState<any>(undefined);
  const [monacoVimEditor, setMonacoVimEditor] = useState<any>(undefined);
  const [monaco, setMonaco] = useState<any>(undefined);
  const [editor, setEditor] = useState<any>(undefined);
  const handleEditorDidMount = (editor: any, monaco: any) => {
    setEditor(editor);
    setMonaco(monaco);
    (window as any).require.config({
      paths: {
        "monaco-vim": "https://unpkg.com/monaco-vim/dist/monaco-vim"
      }
    });
    (window as any).require(["monaco-vim"], function (MonacoVim: any) {
      if (isVimMode) {
        const statusNode = document.querySelector(".status-node");
        const vi = MonacoVim.initVimMode(editor, statusNode);
        setMonacoVimEditor(vi);
      }
      setMonacoVim(MonacoVim);
    });
    if (useCopilot) {
      registerCompletion(monaco, editor, {
        filename: filename,
        endpoint: COMPLETION_ENDPOINT,
        language: 'python',
        maxContextLines: 60,
      });
    }
  };
  useEffect(() => {
    if (monaco && editor && useCopilot) {
      registerCompletion(monaco, editor, {
        filename: filename,
        endpoint: COMPLETION_ENDPOINT,
        language: 'python',
        maxContextLines: 60,
      });
    }
  }, [filename, useCopilot]);
  return (
    <Editor
      beforeMount={setTheme}
      defaultLanguage="python"
      value={code}
      onChange={onChange}
      theme={isDarkMode ? "github-dark" : "github-light"}
      options={{
        fontSize: fontSize
      }}
      loading="Loading Editor..."
      onMount={handleEditorDidMount}
    />
  );
};

export default CodeEditor;
