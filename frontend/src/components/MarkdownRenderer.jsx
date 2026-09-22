import React from 'react';

/**
 * Parses inline markdown elements: **bold**, *italic*, and `code`.
 */
function parseInline(text, _onActionClick) {
  if (!text) return null;

  // Split by inline code first
  const codeParts = text.split(/(`[^`]+`)/g);
  return codeParts.map((codePart, idx) => {
    if (codePart.startsWith('`') && codePart.endsWith('`') && codePart.length >= 2) {
      const codeContent = codePart.slice(1, -1);
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 font-mono text-[11px] sm:text-xs text-cyan-300 shadow-sm"
        >
          {codeContent}
        </code>
      );
    }

    // Now split by bold **...**
    const boldParts = codePart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((boldPart, bIdx) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**') && boldPart.length >= 4) {
        const boldContent = boldPart.slice(2, -2);
        return (
          <strong key={`${idx}-${bIdx}`} className="text-white font-semibold">
            {boldContent}
          </strong>
        );
      }

      // Now split by italic *...*
      const italicParts = boldPart.split(/(\*[^*]+\*)/g);
      return italicParts.map((italicPart, iIdx) => {
        if (italicPart.startsWith('*') && italicPart.endsWith('*') && italicPart.length >= 2) {
          return (
            <em key={`${idx}-${bIdx}-${iIdx}`} className="text-cyan-200/90 italic">
              {italicPart.slice(1, -1)}
            </em>
          );
        }

        return italicPart;
      });
    });
  });
}

/**
 * MarkdownRenderer component
 * Safely parses and renders headings, blockquotes, lists, and inline styles cleanly
 * without displaying raw markdown symbols.
 */
export default function MarkdownRenderer({ content = '', onActionClick = null }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = null;
  let listType = null; // 'ul' or 'ol'
  let inBlockquote = false;
  let blockquoteBuffer = [];

  const flushBlockquote = (key) => {
    if (blockquoteBuffer.length > 0) {
      elements.push(
        <div
          key={`quote-${key}`}
          className="my-3 p-3 sm:p-3.5 rounded-r-xl border-l-4 border-cyan-500 bg-cyan-950/30 text-xs sm:text-sm text-cyan-100/90 leading-relaxed shadow-sm flex items-start gap-2.5"
        >
          <span className="text-cyan-400 text-base select-none shrink-0" aria-hidden="true">
            💡
          </span>
          <div className="space-y-1">
            {blockquoteBuffer.map((line, bIdx) => (
              <p key={bIdx} className="m-0">
                {parseInline(line, onActionClick)}
              </p>
            ))}
          </div>
        </div>
      );
      blockquoteBuffer = [];
      inBlockquote = false;
    }
  };

  const flushList = (key) => {
    if (currentList && currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${key}`} className="my-2 space-y-1.5 list-none pl-0 text-xs sm:text-sm">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-slate-200 leading-relaxed flex-1">
                  {parseInline(item, onActionClick)}
                </span>
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${key}`} className="my-2 space-y-1.5 list-none pl-0 text-xs sm:text-sm">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-cyan-400 font-bold text-sm shrink-0 leading-none mt-1">
                  •
                </span>
                <span className="text-slate-200 leading-relaxed flex-1">
                  {parseInline(item, onActionClick)}
                </span>
              </li>
            ))}
          </ul>
        );
      }
      currentList = null;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      flushList(i);
      flushBlockquote(i);
      continue;
    }

    // Blockquote: starts with >
    if (trimmed.startsWith('>')) {
      flushList(i);
      inBlockquote = true;
      blockquoteBuffer.push(trimmed.replace(/^>\s*/, ''));
      continue;
    } else if (inBlockquote) {
      flushBlockquote(i);
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(i);
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm sm:text-base font-bold text-white tracking-wide mt-3 mb-1.5 flex items-center gap-2 border-b border-slate-800/80 pb-1.5"
        >
          <span className="text-cyan-400 text-xs">◆</span>
          <span>{parseInline(trimmed.slice(4), onActionClick)}</span>
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList(i);
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base sm:text-lg font-bold text-white tracking-tight mt-3.5 mb-2 flex items-center gap-2"
        >
          <span>{parseInline(trimmed.slice(3), onActionClick)}</span>
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList(i);
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-4 mb-2"
        >
          {parseInline(trimmed.slice(2), onActionClick)}
        </h1>
      );
      continue;
    }

    // Ordered list: starts with number followed by dot
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        flushList(i);
        listType = 'ol';
        currentList = [];
      }
      currentList.push(olMatch[2]);
      continue;
    }

    // Unordered list: starts with - or *
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList(i);
        listType = 'ul';
        currentList = [];
      }
      currentList.push(ulMatch[1]);
      continue;
    }

    // Normal paragraph line
    flushList(i);
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed m-0">
        {parseInline(trimmed, onActionClick)}
      </p>
    );
  }

  flushList(lines.length);
  flushBlockquote(lines.length);

  return <div className="space-y-1.5 leading-relaxed text-slate-200">{elements}</div>;
}
