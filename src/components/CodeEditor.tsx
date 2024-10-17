import Editor from '@monaco-editor/react';
import React from 'react';
import { setTheme } from './Themes';

type CodeEditorProps = {
  code: string;
  onChange: (value: string | undefined) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
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
    />
  );
};

export default CodeEditor;
