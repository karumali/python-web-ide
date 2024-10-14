import Editor from '@monaco-editor/react';
import React from 'react';

type CodeEditorProps = {
  code: string;
  onChange: (value: string | undefined) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  return (
    <Editor
      defaultLanguage="python"
      value={code}
      onChange={onChange}
      theme="vs-dark"
      options={{
        fontSize: 20
      }}
      loading="Loading Editor..."
    />
  );
};

export default CodeEditor;
