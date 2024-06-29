// frontend/pages/api/read-log.ts
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { processId } = req.query;

  if (!processId || typeof processId !== 'string') {
    return res.status(400).json({ error: 'Invalid process ID' });
  }

  const logPath = path.join(process.cwd(), '..', 'memory', `${processId}.log`);

  try {
    const logContent = fs.readFileSync(logPath, 'utf8');
    res.status(200).send(logContent);
  } catch (error) {
    console.error('Error reading log file:', error);
    res.status(500).json({ error: 'Failed to read log file' });
  }
}