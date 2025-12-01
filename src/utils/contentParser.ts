import type { ContentNode } from '../types';

export function parseContent(node: ContentNode): string {
  if (!node) return '';

  const parts: string[] = [];

  if (node.text) {
    parts.push(node.text);
  }

  if (node.content && Array.isArray(node.content)) {
    for (let i = 0; i < node.content.length; i++) {
      const child = node.content[i];
      const childText = parseContent(child);
      
      if (childText) {
        parts.push(childText);
      }

      // 在 paragraph 节点后添加换行（除了最后一个）
      if (child.type === 'paragraph' && i < node.content.length - 1) {
        parts.push('\n');
      }

      // 处理 LineBreak 节点
      if (child.type === 'LineBreak') {
        parts.push('\n');
      }
    }
  }

  return parts.join('');
}

export function extractPlainText(content: ContentNode): string {
  return parseContent(content).trim();
}
