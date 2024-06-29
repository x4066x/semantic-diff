import React, { useState } from 'react';
import type { NextPage } from 'next';
import axios from 'axios';
import DebugInfo from './api/read-log';

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

const sampleA = "\
日本には四つの季節があります。春、夏、秋、冬です。\
春は3月から5月頃で、桜が咲き、新学期が始まります。気温が徐々に暖かくなり、新しい生活のスタートの季節です。\
夏は6月から8月頃で、高温多湿になります。海水浴や花火大会など、多くの夏祭りが行われます。\
秋は9月から11月頃で、涼しくなり紅葉が美しい季節です。食欲の秋とも呼ばれ、おいしい食べ物が多く出回ります。\
冬は12月から2月頃で、寒く乾燥した季節です。多くの地域で雪が降り、スキーやスノーボードなどのウィンタースポーツが楽しめます。\
"

const sampleB = "\
日本の気候は一般的に四季に分けられますが、その特徴は地域や年によって大きく異なります。また、近年の気候変動の影響で、従来の季節パターンが変化しつつあることにも注意が必要です。\
春（おおよそ3月〜5月）は北から南へ徐々に暖かくなり、桜前線が移動します。花見や入学式など、新しい始まりを祝う行事が多くあります。一方で、黄砂や花粉症の問題も顕著になります。\
夏（おおよそ6月〜8月）は梅雨期を経て、蒸し暑い日が続きます。地域により台風の影響を受けることもあります。夏祭りや花火大会が各地で開催され、観光業が活況を呈しますが、熱中症対策も重要になります。\
秋（おおよそ9月〜11月）は暑さが和らぎ、徐々に涼しくなります。紅葉や秋の味覚を楽しむ観光が盛んになります。文化の日や勤労感謝の日など、伝統と現代が融合した祝日もあります。\
冬（おおよそ12月〜2月）は地域差が顕著で、北日本では大雪に見般われる一方、南日本では比較的穏やかです。スキー場や温泉地では観光客で賑わいますが、農業や一部の産業では厳しい季節となります。\
各季節は日本の文化、経済、社会に大きな影響を与えており、季節に応じた行事や習慣が今も大切にされています。同時に、気候変動への適応や、持続可能な季節産業の在り方についての議論も進んでいます。\
"

const StructuredTextComparison: React.FC = () => {
  const [textA, setTextA] = useState<string>(sampleA);
  const [textB, setTextB] = useState<string>(sampleB);
  const [structuredA, setStructuredA] = useState<StructuredText[]>([]);
  const [structuredB, setStructuredB] = useState<StructuredText[]>([]);
  const [colorMap, setColorMap] = useState<ColorMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('デバッグ情報はここに表示されます。');
  const [processId, setProcessId] = useState<string | null>(null);


  const handleStructureTexts = async () => {
    if (textA && textB) {
      setIsLoading(true);
      setError(null);
      setProcessId(null);
      setDebugInfo('構造化プロセスを開始します...');
      try {
        const result = await fetchStructuredTexts(textA, textB);
        setStructuredA(result.structuredA);
        setStructuredB(result.structuredB);
        setProcessId(result.processId);

        const typesA = new Set(result.structuredA.map(item => item.type));
        const typesB = new Set(result.structuredB.map(item => item.type));
        const allTypes = new Set([...typesA, ...typesB]);

        const newColorMap: ColorMap = {};
        let colorIndex = 0;
        allTypes.forEach(type => {
          if (typesA.has(type) && typesB.has(type)) {
            newColorMap[type] = generateColor(colorIndex);
            colorIndex++;
          } else {
            newColorMap[type] = 'bg-gray-200';
          }
        });

        setColorMap(newColorMap);
        setDebugInfo("")

      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to structure texts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderStructuredText = (text: StructuredText[]) => {
    return text.map((item) => (
      <div key={item.id} className={`p-2 mb-2 rounded ${colorMap[item.type] || 'bg-gray-200'}`}>
        <span className="font-bold">{item.type}: </span>
        {item.content}
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Semantic diff</h1>
      <div className="flex flex-col md:flex-row mb-4">
        <div className="w-full md:w-1/2 p-2">
          <textarea
            className="w-full p-4 border rounded"
            rows={20}
            placeholder="テキストAを入力"
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
          />
        </div>
        <div className="w-full md:w-1/2 p-2">
          <textarea
            className="w-full p-4 border rounded"
            rows={20}
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
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-bold mb-2">デバッグ情報</h3>
        <DebugInfo processId={processId} />
        {processId && <p>Process ID: {processId}</p>}
        <pre className="mt-2 p-2 bg-white rounded whitespace-pre-wrap">{debugInfo}</pre>
      </div>
    </div>
  );
};

const Home: NextPage = () => {
  return <StructuredTextComparison />;
};

export default Home;