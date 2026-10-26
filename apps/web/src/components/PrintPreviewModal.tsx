import React, { useState } from 'react';
import { X, Printer, Copy, Check } from 'lucide-react';
import { PrintModel, renderHtml, renderThermalText } from '@shopbill/print-model';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  printModel: PrintModel | null;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  printModel,
}) => {
  const [format, setFormat] = useState<'A4' | '80mm' | '58mm' | 'RAW_TEXT'>('80mm');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !printModel) return null;

  const handleBrowserPrint = () => {
    const htmlContent = renderHtml(printModel, format === 'RAW_TEXT' ? '80mm' : format);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleCopyRawText = () => {
    const raw = renderThermalText(printModel, format === '58mm' ? 32 : 48);
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-3xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base">Print Preview</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">
              #{printModel.document.invoice_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector Tabs */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFormat('80mm')}
                className={`px-2.5 py-1 rounded ${
                  format === '80mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
              <button
                onClick={() => setFormat('58mm')}
                className={`px-2.5 py-1 rounded ${
                  format === '58mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm Thermal
              </button>
              <button
                onClick={() => setFormat('A4')}
                className={`px-2.5 py-1 rounded ${
                  format === 'A4' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Standard
              </button>
              <button
                onClick={() => setFormat('RAW_TEXT')}
                className={`px-2.5 py-1 rounded ${
                  format === 'RAW_TEXT'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ESC/POS Text
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100 flex justify-center">
          {format === 'RAW_TEXT' ? (
            <div className="w-full max-w-md bg-white p-6 rounded-xl border border-slate-300 shadow-sm font-mono text-xs whitespace-pre select-text">
              {renderThermalText(printModel, 48)}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden flex flex-col justify-start">
              <iframe
                title="Print Preview Frame"
                srcDoc={renderHtml(printModel, format)}
                className="w-full h-full border-none min-h-[600px] min-w-[360px] md:min-w-[480px]"
              />
            </div>
          )}
        </div>

        {/* Modal Bottom CTAs */}
        <div className="px-5 py-3 bg-surface border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Compatible with any USB, Bluetooth or network thermal receipt printer
          </div>
          <div className="flex items-center gap-2">
            {format === 'RAW_TEXT' && (
              <button
                onClick={handleCopyRawText}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            )}
            <button
              onClick={handleBrowserPrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice [Ctrl+P]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
