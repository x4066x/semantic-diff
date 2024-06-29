import React, { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import axios from 'axios';

interface StructuredText {
  id: number;
  type: string;
  content: string;
}

type ColorMap = Record<string, string>;

const generateColor = (index: number): string => {
  const colors = [
    'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 
    'bg-pink-100', 'bg-purple-100', 'bg-indigo-100',
    'bg-red-100', 'bg-orange-100', 'bg-teal-100'
  ];
  return colors[index % colors.length];
};

const fetchStructuredTexts = async (textA: string, textB: string): Promise<{ processId: string, structuredA: StructuredText[], structuredB: StructuredText[] }> => {
  const response = await axios.post('http://localhost:8000/structure_texts', { textA, textB });
  return response.data;
};

const StructuredTextComparison: React.FC = () => {
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [structuredA, setStructuredA] = useState<StructuredText[]>([]);
  const [structuredB, setStructuredB] = useState<StructuredText[]>([]);
  const [colorMap, setColorMap] = useState<ColorMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [processId, setProcessId] = useState<string | null>(null);

  const handleStructureTexts = async () => {
    if (textA && textB) {
      setIsLoading(true);
      setError(null);
      setProcessId(null);
      setDebugInfo('');
      try {
        const result = await fetchStructuredTexts(textA, textB);
        setStructuredA(result.structuredA);
        setStructuredB(result.structuredB);
        setProcessId(result.processId);

        // ユニークなTypeのみを抽出
        const typesA = new Set(result.structuredA.map(item => item.type));
        const typesB = new Set(result.structuredB.map(item => item.type));
        const commonTypes = [...typesA].filter(type => typesB.has(type));

        // カラーを割り当て
        const newColorMap: ColorMap = {};
        commonTypes.forEach((type, index) => {
          newColorMap[type] = generateColor(index);
        });
        setColorMap(newColorMap);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to structure texts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderStructuredText = (text: StructuredText[]) => {
    return text.map(item => (
      <div key={item.id} className={`p-2 mb-2 rounded ${colorMap[item.type] || 'bg-gray-100'}`}>
        <span className="font-bold">{item.type}: </span>
        {item.content}
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">構造化テキスト比較</h1>
      <div className="flex flex-col md:flex-row mb-4">
        <div className="w-full md:w-1/2 p-2">
          <textarea
            className="w-full p-4 border rounded"
            rows={8}
            placeholder="テキストAを入力"
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/2 p-2">
          <textarea
            className="w-full p-4 border rounded"
            rows={8}
            placeholder="テキストBを入力"
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
          />
        </div>
      </div>
      <div className="text-center mb-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleStructureTexts}
          disabled={isLoading}
        >
          テキストを構造化
        </button>
      </div>
      {isLoading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
      {!isLoading && !error && (
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 p-4">
            <h2 className="text-xl font-bold mb-2">テキストA（構造化）</h2>
            {renderStructuredText(structuredA)}
          </div>
          <div className="w-full md:w-1/2 p-4">
            <h2 className="text-xl font-bold mb-2">テキストB（構造化）</h2>
            {renderStructuredText(structuredB)}
          </div>
        </div>
      )}
      {processId && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-bold mb-2">デバッグ情報</h3>
          <p>Process ID: {processId}</p>
          <pre className="mt-2 p-2 bg-white rounded whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

const Home: NextPage = () => {
  return <StructuredTextComparison />;
};

export default Home;