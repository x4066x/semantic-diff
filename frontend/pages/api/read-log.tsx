import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DebugInfoProps {
  processId: string | null;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ processId }) => {
  const [debugInfo, setDebugInfo] = useState<string>('デバッグ情報を取得中...');

  const fetchDebugInfo = async (id: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/debug_info/${id}`);
      setDebugInfo(response.data.debug_info);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setDebugInfo('デバッグ情報はまだ利用できません。');
        } else {
          setDebugInfo(`エラー: ${error.message}`);
        }
      } else {
        setDebugInfo('デバッグ情報の取得中に予期せぬエラーが発生しました。');
      }
      console.error('Error fetching debug info:', error);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (processId) {
      fetchDebugInfo(processId);
      intervalId = setInterval(() => fetchDebugInfo(processId), 5000); // 5秒ごとに更新
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [processId]);

  if (!processId) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded">
      <h3 className="text-lg font-bold mb-2">デバッグ情報</h3>
        <p>Process ID: {processId}</p>
      <pre className="mt-2 p-2 bg-white rounded whitespace-pre-wrap">{debugInfo}</pre>
    </div>
  );
};

export default DebugInfo;