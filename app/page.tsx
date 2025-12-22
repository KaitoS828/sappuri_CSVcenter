"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Download, Loader2, FileText, Edit, Trash2, X, Check, Save, HelpCircle, Keyboard, Info, Wand2, Clock } from "lucide-react";
import * as XLSX from 'xlsx';

interface ExtractedData {
    name: string;
    furigana: string;
    gender: string;
    dob: string;
    postalCode: string;
    address: string;
    phone: string;
    occupation: string;
    _sourceUrl?: string;
    _sourceType?: string;
}

export default function Home() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ExtractedData[]>([]);

    // Timer State
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Editing State
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<ExtractedData | null>(null);

    // Help Modal State
    const [showHelp, setShowHelp] = useState(false);
    const [activeHelpTab, setActiveHelpTab] = useState<'guide' | 'shortcuts' | 'faq'>('guide');

    // Load from LocalStorage
    useEffect(() => {
        const savedData = localStorage.getItem("supplement-csv-data");
        if (savedData) {
            try {
                setData(JSON.parse(savedData));
            } catch (e) {
                console.error("Failed to load saved data", e);
            }
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem("supplement-csv-data", JSON.stringify(data));
    }, [data]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingIndex === null) return;

            // Ctrl + Enter to Save
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveClick(editingIndex);
            }
            // Esc to Cancel
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelClick();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingIndex, editFormData]); // Re-bind when form data changes

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        await processFiles(Array.from(selectedFiles));
    };

    const processFiles = async (files: File[]) => {
        setLoading(true);
        setElapsedTime(0);

        // Start Timer
        const startTime = Date.now();
        timerIntervalRef.current = setInterval(() => {
            setElapsedTime((Date.now() - startTime) / 1000);
        }, 100);

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/extract', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to process ${file.name}`);
                }

                const result: ExtractedData[] = await response.json();

                const sourceUrl = URL.createObjectURL(file);
                const newData = result.map(item => ({
                    ...item,
                    _sourceUrl: sourceUrl,
                    _sourceType: file.type
                }));

                setData(prev => [...prev, ...newData]);
            } catch (error) {
                console.error("Error processing file:", error);
            }
        }

        // Stop Timer
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        setLoading(false);
    };

    const normalizeData = (item: ExtractedData): ExtractedData => {
        // 1. Phone Normalization (09012345678 -> 090-1234-5678)
        let phone = item.phone.replace(/[^\d]/g, ""); // remove non-digits
        if (phone.length === 11) {
            phone = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
        } else if (phone.length === 10) {
            phone = `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
        } else {
            phone = item.phone; // keep original if length mismatch
        }

        // 2. Date Normalization (YYYY-MM-DD, YYYY.MM.DD -> YYYY/MM/DD)
        let dob = item.dob.replace(/[-.]/g, "/");

        return { ...item, phone, dob };
    };

    const downloadCSV = () => {
        if (data.length === 0) return;

        const headers = ["Name", "Furigana", "Gender", "DOB", "Postal Code", "Address", "Phone", "Occupation"];
        const csvContent = [
            headers.join(","),
            ...data.map(row => [
                `"${row.name}"`,
                `"${row.furigana}"`,
                `"${row.gender}"`,
                `"${row.dob}"`,
                `"${row.postalCode}"`,
                `"${row.address}"`,
                `"${row.phone}"`,
                `"${row.occupation}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'extracted_data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const downloadExcel = () => {
        if (data.length === 0) return;
        const exportData = data.map(({ _sourceUrl, _sourceType, ...rest }) => rest);
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
        XLSX.writeFile(workbook, "extracted_data.xlsx");
    };

    const clearAllData = () => {
        if (confirm("全てのデータを削除しますか？")) {
            setData([]);
            localStorage.removeItem("supplement-csv-data");
            setElapsedTime(0);
        }
    };

    const handleEditClick = (index: number, row: ExtractedData) => {
        setEditingIndex(index);
        setEditFormData({ ...row });
    };

    const handleCancelClick = () => {
        setEditingIndex(null);
        setEditFormData(null);
    };

    const handleSaveClick = (index: number) => {
        if (!editFormData) return;

        // Normalize before saving
        const normalized = normalizeData(editFormData);

        const newData = [...data];
        newData[index] = normalized;
        setData(newData);
        setEditingIndex(null);
        setEditFormData(null);
    };

    const handleDeleteClick = (index: number) => {
        if (confirm("この行を削除しますか？")) {
            const newData = [...data];
            newData.splice(index, 1);
            setData(newData);
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof ExtractedData) => {
        if (!editFormData) return;
        setEditFormData({ ...editFormData, [field]: e.target.value });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processFiles(files);
    };

    const HelpModal = () => (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-blue-500" /> 使い方ガイド
                    </h2>
                    <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex border-b border-gray-100">
                    <button onClick={() => setActiveHelpTab('guide')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeHelpTab === 'guide' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>機能紹介</button>
                    <button onClick={() => setActiveHelpTab('shortcuts')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeHelpTab === 'shortcuts' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>ショートカット</button>
                    <button onClick={() => setActiveHelpTab('faq')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeHelpTab === 'faq' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>F.A.Q</button>
                </div>
                <div className="p-8 h-96 overflow-y-auto">
                    {activeHelpTab === 'guide' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg h-fit"><Upload className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800">1. ファイルをアップロード</h3>
                                    <p className="text-sm text-gray-600 mt-1">PDF（複数ページ可）や画像をドラッグ＆ドロップ。一度に複数のファイルを投げ込めます。</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg h-fit"><Edit className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800">2. 比較しながら編集 (Split View)</h3>
                                    <p className="text-sm text-gray-600 mt-1">「Edit」ボタンを押すと、左に原本、右に入力フォームが表示されます。見比べながらサクサク修正。</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-lg h-fit"><Download className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800">3. データのエクスポート</h3>
                                    <p className="text-sm text-gray-600 mt-1">CSVまたはExcel形式で出力。データはブラウザに自動保存されるので、閉じても安心です。</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeHelpTab === 'shortcuts' && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="font-medium text-gray-700">保存して閉じる</span>
                                <div className="flex gap-2">
                                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-500 font-mono shadow-sm">Ctrl</kbd>
                                    <span className="text-gray-300">+</span>
                                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-500 font-mono shadow-sm">Enter</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="font-medium text-gray-700">キャンセル</span>
                                <div className="flex gap-2">
                                    <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-500 font-mono shadow-sm">Esc</kbd>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeHelpTab === 'faq' && (
                        <div className="space-y-4">
                            <details className="group p-4 bg-gray-50 rounded-lg open:bg-blue-50 transition-colors">
                                <summary className="font-bold text-gray-700 cursor-pointer list-none flex justify-between items-center">
                                    データが消えた！
                                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <p className="text-sm text-gray-600 mt-2 ml-2">ブラウザのLocalStorageに保存されています。ページを再読み込みしても残っていますが、「CLEAR」ボタンを押すと完全に消去されます。</p>
                            </details>
                            <details className="group p-4 bg-gray-50 rounded-lg open:bg-blue-50 transition-colors">
                                <summary className="font-bold text-gray-700 cursor-pointer list-none flex justify-between items-center">
                                    読み取り精度が低い
                                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <p className="text-sm text-gray-600 mt-2 ml-2">画質が低い場合や、手書き文字が崩れている場合に発生します。高解像度の画像をお試しください。</p>
                            </details>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const TimerDisplay = () => (
        <div className={`fixed bottom-8 right-8 bg-white border border-gray-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-3 transition-all transform ${loading || elapsedTime > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className={`relative flex items-center justify-center ${loading ? 'animate-pulse' : ''}`}>
                <Clock className={`w-5 h-5 ${loading ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Processing Time</span>
                <span className={`text-xl font-mono font-medium ${loading ? 'text-blue-600' : 'text-gray-700'}`}>
                    {elapsedTime.toFixed(1)}s
                </span>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen p-8 md:p-12 font-sans text-[#333]">
            {showHelp && <HelpModal />}
            <TimerDisplay />

            {/* Split View Overlay */}
            {editingIndex !== null && editFormData && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full h-[90vh] max-w-7xl rounded-xl shadow-2xl flex overflow-hidden">
                        {/* Left: Source Preview */}
                        <div className="w-1/2 bg-gray-100 border-r border-gray-200 relative">
                            <div className="absolute top-4 left-4 z-10 bg-white/80 px-3 py-1 rounded text-xs font-bold shadow-sm">
                                ORIGINAL FILE
                            </div>
                            {editFormData._sourceUrl ? (
                                editFormData._sourceType === 'application/pdf' ? (
                                    <iframe src={editFormData._sourceUrl} className="w-full h-full" />
                                ) : (
                                    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                                        <img src={editFormData._sourceUrl} alt="Source" className="max-w-none shadow-lg" />
                                    </div>
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Preview Available
                                </div>
                            )}
                        </div>

                        {/* Right: Edit Form */}
                        <div className="w-1/2 flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Edit className="w-5 h-5" /> Edit Data
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        <kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+Enter</kbd> to Save,
                                        <kbd className="font-mono bg-gray-100 px-1 rounded ml-1">Esc</kbd> to Cancel
                                    </p>
                                </div>
                                <button onClick={handleCancelClick} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.name}
                                            onChange={(e) => handleInputChange(e, 'name')}
                                            placeholder="Name"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Furigana</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.furigana}
                                            onChange={(e) => handleInputChange(e, 'furigana')}
                                            placeholder="Furigana"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.gender}
                                            onChange={(e) => handleInputChange(e, 'gender')}
                                            placeholder="Gender"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date of Birth</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.dob}
                                            onChange={(e) => handleInputChange(e, 'dob')}
                                            placeholder="YYYY/MM/DD"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.address}
                                            onChange={(e) => handleInputChange(e, 'address')}
                                            placeholder="Address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Postal Code</label>
                                        <input
                                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${!editFormData.postalCode ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                            value={editFormData.postalCode}
                                            onChange={(e) => handleInputChange(e, 'postalCode')}
                                            placeholder="000-0000"
                                        />
                                        {!editFormData.postalCode && <p className="text-xs text-red-500">Required</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.phone}
                                            onChange={(e) => handleInputChange(e, 'phone')}
                                            placeholder="090-0000-0000"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Occupation</label>
                                        <input
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editFormData.occupation}
                                            onChange={(e) => handleInputChange(e, 'occupation')}
                                            placeholder="Occupation"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={handleCancelClick}
                                    className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveClick(editingIndex!)}
                                    className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <header className="space-y-6 pt-8 relative">
                    <h1 className="text-3xl font-light tracking-wider text-center text-gray-800">
                        サプリCSVセンター <span className="text-xs font-bold bg-gray-900 text-white px-2 py-1 rounded ml-2">ULTIMATE</span>
                    </h1>
                    <button
                        onClick={() => setShowHelp(true)}
                        className="absolute right-0 top-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <HelpCircle className="w-6 h-6" />
                        <span className="text-sm font-medium hidden md:inline">使い方ガイド</span>
                    </button>
                </header>

                {/* Upload Area */}
                <div
                    className="group relative cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="relative bg-white rounded-xl p-16 text-center border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleFileUpload}
                            accept="image/*,.pdf"
                            multiple
                        />
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300">
                                {loading ? <Loader2 className="w-10 h-10 animate-spin text-blue-500" /> : <Upload className="w-10 h-10" />}
                            </div>
                            <div>
                                <p className="text-xl font-medium text-gray-700 tracking-wide">
                                    Drop files here (PDF/Images)
                                </p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Supports Multi-page PDFs & Bulk Upload
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Display */}
                {data.length > 0 && (
                    <div className="space-y-6 animate-in fade-in duration-700">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                            <h2 className="text-lg font-medium tracking-wide flex items-center gap-3 text-gray-700">
                                <FileText className="w-5 h-5 text-gray-400" />
                                {data.length} Records Extracted
                            </h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={clearAllData}
                                    className="flex items-center gap-2 text-gray-400 hover:text-red-500 px-4 py-2 text-xs font-bold tracking-widest transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> CLEAR
                                </button>
                                <button
                                    onClick={downloadExcel}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded shadow-sm hover:shadow-md text-xs font-bold tracking-widest transition-all"
                                >
                                    <FileText className="w-3 h-3" /> EXCEL
                                </button>
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2 rounded shadow-sm hover:shadow-md text-xs font-bold tracking-widest transition-all"
                                >
                                    <Download className="w-3 h-3" /> CSV
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                        <tr>
                                            <th className="p-4 font-semibold w-10">#</th>
                                            <th className="p-4 font-semibold w-32">ACTION</th>
                                            <th className="p-4 font-semibold">NAME</th>
                                            <th className="p-4 font-semibold">FURIGANA</th>
                                            <th className="p-4 font-semibold">GENDER</th>
                                            <th className="p-4 font-semibold">DOB</th>
                                            <th className="p-4 font-semibold">POSTAL</th>
                                            <th className="p-4 font-semibold">ADDRESS</th>
                                            <th className="p-4 font-semibold">PHONE</th>
                                            <th className="p-4 font-semibold">OCCUPATION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.map((row, i) => (
                                            <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-4 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(i, row)}
                                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(i)}
                                                            className="p-1 text-red-400 hover:bg-red-100 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-medium text-gray-900">{row.name}</td>
                                                <td className="p-4 text-gray-600">{row.furigana}</td>
                                                <td className="p-4 text-gray-600">{row.gender}</td>
                                                <td className="p-4 text-gray-600">{row.dob}</td>
                                                <td className={`p-4 ${!row.postalCode ? 'text-red-400 italic' : 'text-gray-600'}`}>
                                                    {row.postalCode || 'Missing'}
                                                </td>
                                                <td className="p-4 text-gray-600">{row.address}</td>
                                                <td className="p-4 text-gray-600">{row.phone}</td>
                                                <td className="p-4 text-gray-600">{row.occupation}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
