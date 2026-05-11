import React, { useState, useCallback, useRef } from 'react';
import {
  RiCloseLine,
  RiUploadCloudLine,
  RiDownloadLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiFileTextLine,
} from 'react-icons/ri';
import {profilesAPI, BatchImportResponse} from '../../api/profiles';

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'result';

interface ParsedRow {
  name: string;
  platform: string;
  proxy_id: string;
  os: string;
  timezone: string;
  locale: string;
}

const CSV_TEMPLATE = `name,platform,proxy_id,os,timezone,locale
日本推特#1,twitter,JP-01,windows,Asia/Tokyo,ja-JP
日本推特#2,twitter,JP-02,windows,Asia/Tokyo,ja-JP
美国脸书#1,facebook,US-01,windows,America/New_York,en-US`;

const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BatchImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'environment_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const parseCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          setParseError('CSV文件至少需要包含表头和一行数据');
          return;
        }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(f => !header.includes(f));
        if (missingFields.length > 0) {
          setParseError(`CSV缺少必需列: ${missingFields.join(', ')}`);
          return;
        }

        const rows: ParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          header.forEach((col, idx) => {
            row[col] = values[idx] || '';
          });
          rows.push({
            name: row.name || '',
            platform: row.platform || '',
            proxy_id: row.proxy_id || '',
            os: row.os || 'windows',
            timezone: row.timezone || '',
            locale: row.locale || '',
          });
        }

        setParsedRows(rows.slice(0, 5)); // 前5行预览
        setStep('preview');
        setParseError(null);
      } catch {
        setParseError('CSV解析失败，请检查文件格式');
      }
    };
    reader.onerror = () => setParseError('文件读取失败');
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setParseError('请上传CSV文件');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      parseCSV(droppedFile);
    } else {
      setParseError('请上传CSV文件');
    }
  }, [parseCSV]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await profilesAPI.batchImport(file);
      setResult(res.data);
      setStep('result');
    } catch (err) {
      setParseError('导入失败: ' + (err as Error).message);
      setStep('upload');
    } finally {
      setImporting(false);
    }
  }, [file]);

  const handleBack = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedRows([]);
    setResult(null);
    setParseError(null);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        width: 520,
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e7e5e4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>批量导入环境</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, flex: 1, overflow: 'auto' }}>
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div>
              {/* Download Template */}
              <button
                onClick={handleDownloadTemplate}
                className="btn"
                style={{ width: '100%', marginBottom: 16, justifyContent: 'center', gap: 8 }}
              >
                <RiDownloadLine size={18} />
                下载CSV模板
              </button>

              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #d6d3d1',
                  borderRadius: 8,
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <RiUploadCloudLine size={48} style={{ color: '#a8a29e', marginBottom: 12 }} />
                <p style={{ margin: '0 0 8px', color: '#1c1917', fontWeight: 500 }}>
                  拖拽CSV文件到此处，或点击选择文件
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#78716c' }}>
                  支持 UTF-8 编码的 CSV 文件
                </p>
              </div>

              {parseError && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  background: '#fef2f2',
                  borderRadius: 6,
                  color: '#e11d48',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <RiErrorWarningLine size={16} />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div>
              <div style={{
                padding: '10px 14px',
                background: '#fafaf9',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 13,
                color: '#78716c',
              }}>
                <RiFileTextLine size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                已选择: <strong>{file?.name}</strong>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#1c1917' }}>
                预览（前5行）：
              </p>

              <div style={{
                border: '1px solid #e7e5e4',
                borderRadius: 8,
                overflow: 'hidden',
                fontSize: 13,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafaf9' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>#</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>名称</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>平台</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>代理ID</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>OS</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>时区</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>语言</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #e7e5e4' }}>
                        <td style={{ padding: '8px 12px', color: '#78716c' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px' }}>{row.name}</td>
                        <td style={{ padding: '8px 12px' }}>{row.platform || '-'}</td>
                        <td style={{ padding: '8px 12px' }}>{row.proxy_id || '-'}</td>
                        <td style={{ padding: '8px 12px' }}>{row.os}</td>
                        <td style={{ padding: '8px 12px' }}>{row.timezone || '-'}</td>
                        <td style={{ padding: '8px 12px' }}>{row.locale || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parseError && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  background: '#fef2f2',
                  borderRadius: 6,
                  color: '#e11d48',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <RiErrorWarningLine size={16} />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div>
              {/* Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 20,
              }}>
                <div style={{
                  padding: 16,
                  background: '#fafaf9',
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1c1917' }}>{result.total}</div>
                  <div style={{ fontSize: 13, color: '#78716c' }}>总行数</div>
                </div>
                <div style={{
                  padding: 16,
                  background: '#f0fdf4',
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>{result.succeeded}</div>
                  <div style={{ fontSize: 13, color: '#78716c' }}>成功</div>
                </div>
                <div style={{
                  padding: 16,
                  background: result.failed > 0 ? '#fef2f2' : '#fafaf9',
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: result.failed > 0 ? '#e11d48' : '#78716c' }}>{result.failed}</div>
                  <div style={{ fontSize: 13, color: '#78716c' }}>失败</div>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 500, color: '#1c1917' }}>
                    失败详情：
                  </p>
                  <div style={{
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    overflow: 'hidden',
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}>
                    {result.errors.map((err, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          fontSize: 13,
                          borderBottom: idx < result.errors.length - 1 ? '1px solid #fecaca' : 'none',
                          display: 'flex',
                          gap: 12,
                        }}
                      >
                        <span style={{ color: '#e11d48', fontWeight: 500 }}>行 {err.row}:</span>
                        <span style={{ color: '#78716c' }}>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.succeeded > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  borderRadius: 6,
                  color: '#16a34a',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <RiCheckLine size={16} />
                  成功导入 {result.succeeded} 个环境
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e7e5e4',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          {step === 'preview' && (
            <>
              <button onClick={handleBack} className="btn" style={{ padding: '10px 20px' }}>
                返回
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="apple-btn apple-btn-primary"
                style={{ padding: '10px 20px' }}
              >
                {importing ? '导入中...' : '确认导入'}
              </button>
            </>
          )}
          {step === 'result' && (
            <button onClick={onClose} className="apple-btn apple-btn-primary" style={{ padding: '10px 20px' }}>
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
