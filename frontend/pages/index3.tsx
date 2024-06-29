import React from 'react';
import type { NextPage } from 'next';

// 汎用的なカテゴリータイプ
type CategoryType = string;

// 汎用的なセクションインターフェース
interface GenericSection {
  id: string;
  content: string;
  category: CategoryType;
}

// 色生成関数
const generateColor = (index: number): string => {
  const colors = [
    'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 
    'bg-orange-200', 'bg-indigo-200', 'bg-purple-200',
    'bg-red-200', 'bg-pink-200', 'bg-teal-200'
  ];
  return colors[index % colors.length];
};

// 比較データインターフェース
interface ComparisonData {
  title: string;
  originalTitle: string;
  updatedTitle: string;
  originalSections: GenericSection[];
  updatedSections: GenericSection[];
}

// 日本の四季に関する比較データ
const seasonComparisonData: ComparisonData = {
  title: "日本の四季の説明文: 構造化された意味的比較",
  originalTitle: "原文",
  updatedTitle: "更新後",
  originalSections: [
    { id: 'o1', content: '日本には四つの季節があります。春、夏、秋、冬です。', category: 'overview' },
    { id: 'o2', content: '春は3月から5月頃で、桜が咲き、新学期が始まります。気温が徐々に暖かくなり、新しい生活のスタートの季節です。', category: 'spring' },
    { id: 'o3', content: '夏は6月から8月頃で、高温多湿になります。海水浴や花火大会など、多くの夏祭りが行われます。', category: 'summer' },
    { id: 'o4', content: '秋は9月から11月頃で、涼しくなり紅葉が美しい季節です。食欲の秋とも呼ばれ、おいしい食べ物が多く出回ります。', category: 'autumn' },
    { id: 'o5', content: '冬は12月から2月頃で、寒く乾燥した季節です。多くの地域で雪が降り、スキーやスノーボードなどのウィンタースポーツが楽しめます。', category: 'winter' }
  ],
  updatedSections: [
    { id: 'u1', content: '日本の気候は一般的に四季に分けられますが、その特徴は地域や年によって大きく異なります。また、近年の気候変動の影響で、従来の季節パターンが変化しつつあることにも注意が必要です。', category: 'overview' },
    { id: 'u2', content: '春（おおよそ3月〜5月）は北から南へ徐々に暖かくなり、桜前線が移動します。花見や入学式など、新しい始まりを祝う行事が多くあります。一方で、黄砂や花粉症の問題も顕著になります。', category: 'spring' },
    { id: 'u3', content: '夏（おおよそ6月〜8月）は梅雨期を経て、蒸し暑い日が続きます。地域により台風の影響を受けることもあります。夏祭りや花火大会が各地で開催され、観光業が活況を呈しますが、熱中症対策も重要になります。', category: 'summer' },
    { id: 'u4', content: '秋（おおよそ9月〜11月）は暑さが和らぎ、徐々に涼しくなります。紅葉や秋の味覚を楽しむ観光が盛んになります。文化の日や勤労感謝の日など、伝統と現代が融合した祝日もあります。', category: 'autumn' },
    { id: 'u5', content: '冬（おおよそ12月〜2月）は地域差が顕著で、北日本では大雪に見般われる一方、南日本では比較的穏やかです。スキー場や温泉地では観光客で賑わいますが、農業や一部の産業では厳しい季節となります。', category: 'winter' },
    { id: 'u6', content: '各季節は日本の文化、経済、社会に大きな影響を与えており、季節に応じた行事や習慣が今も大切にされています。同時に、気候変動への適応や、持続可能な季節産業の在り方についての議論も進んでいます。', category: 'conclusion' }
  ]
};

const GenericComparisonUI: React.FC<{ data: ComparisonData }> = ({ data }) => {
  const categories = Array.from(new Set([
    ...data.originalSections.map(s => s.category),
    ...data.updatedSections.map(s => s.category)
  ]));
  const colorMap = Object.fromEntries(categories.map((category, index) => [category, generateColor(index)]));

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">{data.title}</h1>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 p-4">
          <h2 className="text-xl font-bold mb-2">{data.originalTitle}</h2>
          {data.originalSections.map((section) => (
            <p key={section.id} className={`${colorMap[section.category]} p-2 mb-2 rounded`}>
              {section.content}
            </p>
          ))}
        </div>
        <div className="w-full md:w-1/2 p-4">
          <h2 className="text-xl font-bold mb-2">{data.updatedTitle}</h2>
          {data.updatedSections.map((section) => (
            <p key={section.id} className={`${colorMap[section.category]} p-2 mb-2 rounded`}>
              {section.content}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

const Home: NextPage = () => {
  return <GenericComparisonUI data={seasonComparisonData} />;
};

export default Home;