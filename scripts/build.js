#!/usr/bin/env node
// =============================================================
// scripts/build.js
// q_and_a_data.json の search_text を自動生成する
// 使い方: node scripts/build.js
// =============================================================

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'q_and_a_data.json');

// ── カタカナ ↔ ひらがな変換 ─────────────────────────────────
function toHiragana(str) {
    return str.replace(/[\u30a1-\u30f6]/g, ch =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}
function toKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, ch =>
        String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
}

// ── LaTeX 数式を除去 ─────────────────────────────────────────
function stripLatex(str) {
    return str
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')       // $$...$$  ブロック数式
        .replace(/\$[^$\n]+?\$/g, ' ')            // $...$    インライン数式
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, ' ')   // \cmd{...}
        .replace(/\\[a-zA-Z]+/g, ' ')             // \cmd
        .replace(/[{}^_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── search_text を生成 ────────────────────────────────────────
// ひらがな・カタカナ両方を含めることで、どちらで検索しても当たるようにする
function buildSearchText(item) {
    const fields = [
        ...(item.questions || []),
        item.description || '',
        ...(item.keywords || []),
        ...(item.synonyms || []),
        item.category || '',
    ];

    const cleaned = fields
        .map(s => stripLatex(String(s)))
        .filter(Boolean)
        .join(' ');

    // 重複を避けつつひらがな・カタカナ両形を付加
    const hiragana = toHiragana(cleaned);
    const katakana = toKatakana(cleaned);

    // 3つを結合して正規化
    return [cleaned, hiragana, katakana]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── メイン ───────────────────────────────────────────────────
const raw = fs.readFileSync(JSON_PATH, 'utf-8');
const data = JSON.parse(raw);

let changed = 0;
for (const item of data) {
    const generated = buildSearchText(item);
    if (item.search_text !== generated) {
        item.search_text = generated;
        changed++;
    }
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 4), 'utf-8');
console.log(`✅ search_text 生成完了（${changed} 件更新 / ${data.length} 件中）`);