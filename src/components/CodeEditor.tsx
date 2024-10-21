import Editor from '@monaco-editor/react';
import React, { useEffect, useState } from 'react';
import { setTheme } from './Themes';

type CodeEditorProps = {
  code: string;
  onChange: (value: string | undefined) => void;
  isVimMode: boolean;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, isVimMode }) => {
  const [monacoVim, setMonacoVim] = useState<any>(undefined);
  const [monacoVimEditor, setMonacoVimEditor] = useState<any>(undefined);
  const handleEditorDidMount = (editor: any, monaco: any) => {
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
  };
  return (
    <Editor
      beforeMount={setTheme}
      defaultLanguage="python"
      value={code}
      onChange={onChange}
      theme="github-dark"
      options={{
        fontSize: 20
      }}
      loading="Loading Editor..."
      onMount={handleEditorDidMount}
    />
  );
};

export default CodeEditor;
