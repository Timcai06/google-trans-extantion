import { DrawnCard } from "../types";
import { GROQ_CONFIG } from "./groqConfig";

// Configuration
const OLLAMA_CONFIG = {
  baseUrl: 'http://localhost:11434',
  model: 'tinyllama',
  timeout: 60000, // 60 seconds
  temperature: 0.7,
  top_p: 0.9
};

/**
 * Generate a tarot reading using Groq, Ollama or fallback to local template
 */
export const generateReading = async (cards: DrawnCard[]): Promise<string> => {
  try {
    // Try Groq first
    if (GROQ_CONFIG.apiKey && GROQ_CONFIG.apiKey !== 'YOUR_API_KEY_HERE') {
      const reading = await tryGroq(cards);
      if (reading) {
        console.log('✅ Reading generated using Groq');
        return reading;
      }
    }
  } catch (error) {
    console.warn('⚠️ Groq failed, trying Ollama:', error);
  }

  try {
    // Try Ollama as fallback
    const reading = await tryOllama(cards);
    if (reading) {
      console.log('✅ Reading generated using Ollama');
      return reading;
    }
  } catch (error) {
    console.warn('⚠️ Ollama failed, using fallback:', error);
  }

  // Fallback to local template
  console.log('📖 Using local fallback reading');
  return generateFallbackReading(cards);
};

/**
 * Try to generate reading using Groq API
 */
const tryGroq = async (cards: DrawnCard[]): Promise<string | null> => {
  try {
    const prompt = buildPrompt(cards);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROQ_CONFIG.timeout);

    const response = await fetch(GROQ_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是一位精通神秘学、同时深谙现代心理学与现实生活策略的塔罗占卜师。请严格按照要求的 Markdown 格式输出解读内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: GROQ_CONFIG.temperature,
        top_p: GROQ_CONFIG.top_p,
        max_tokens: GROQ_CONFIG.maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Groq response received');

    if (result.choices && result.choices[0] && result.choices[0].message) {
      return result.choices[0].message.content;
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      console.warn('❌ Groq error:', error.message);
    }
    return null;
  }
};

/**
 * Try to generate reading using Gemini API
 */
const tryGemini = async (cards: DrawnCard[]): Promise<string | null> => {
  try {
    const prompt = buildPrompt(cards);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_CONFIG.timeout);

    const url = `${GEMINI_CONFIG.baseUrl}?key=${GEMINI_CONFIG.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `你是一位精通神秘学、同时深谙现代心理学与现实生活策略的塔罗占卜师。请严格按照要求的 Markdown 格式输出解读内容。\n\n${prompt}`
          }]
        }],
        generationConfig: {
          temperature: GEMINI_CONFIG.temperature,
          topP: GEMINI_CONFIG.topP,
          maxOutputTokens: GEMINI_CONFIG.maxTokens
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Gemini response received');

    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      return result.candidates[0].content.parts[0].text;
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      console.warn('❌ Gemini error:', error.message);
    }
    return null;
  }
};

/**
 * Try to generate reading using DeepSeek API
 */
const tryDeepSeek = async (cards: DrawnCard[]): Promise<string | null> => {
  try {
    const prompt = buildPrompt(cards);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_CONFIG.timeout);

    const response = await fetch(DEEPSEEK_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是一位精通神秘学、同时深谙现代心理学与现实生活策略的塔罗占卜师。请严格按照要求的 Markdown 格式输出解读内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: DEEPSEEK_CONFIG.temperature,
        top_p: DEEPSEEK_CONFIG.top_p,
        max_tokens: DEEPSEEK_CONFIG.maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ DeepSeek response received');

    if (result.choices && result.choices[0] && result.choices[0].message) {
      return result.choices[0].message.content;
    }

    return null;
  } catch (error) {
    if (error instanceof Error) {
      console.warn('❌ DeepSeek error:', error.message);
    }
    return null;
  }
};

/**
 * Try to generate reading using Ollama
 */
const tryOllama = async (cards: DrawnCard[]): Promise<string | null> => {
  try {
    const prompt = buildPrompt(cards);

    // Send request to background script to handle Ollama API call
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'ollama-generate',
        data: {
          model: OLLAMA_CONFIG.model,
          prompt: prompt,
          stream: false,
          temperature: OLLAMA_CONFIG.temperature,
          top_p: OLLAMA_CONFIG.top_p,
          num_ctx: 2048,
          num_predict: 1024
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });

    return response.response || null;
  } catch (error) {
    if (error instanceof Error) {
      console.warn('❌ Ollama error:', error.message);
    }
    return null;
  }
};

/**
 * Build the prompt for Ollama
 */
const buildPrompt = (cards: DrawnCard[]): string => {
  const cardDescriptions = cards
    .map(c => 
      `${c.position}: ${c.name} (${c.name_en}) [${c.isReversed ? '逆位 (Reversed)' : '正位 (Upright)'}]`
    )
    .join('\n');

  return `你是一位精通神秘学、同时深谙现代心理学与现实生活策略的塔罗占卜师。
请根据以下抽出的三张牌进行深度解读：
${cardDescriptions}

背景设定：
- 第一张牌代表"过去"。
- 第二张牌代表"现在"。
- 第三张牌代表"未来"。

请严格按照以下 Markdown 格式输出。
**重要规则**：
1. **绝对不要使用任何 Emoji 表情符号**（如 ⚔️, 🔮, ✨ 等），只使用纯文本。
2. 不要添加 Markdown 代码块标记（如 \`\`\`markdown），直接输出内容。
3. 整体语调神秘、诗意，但在"现实行动指南"部分必须**极其落地、现实、具体**。
4. **内容要丰富详实**：每个部分都要有充分的文字说明，避免过于简洁。段落之间要有适当的间隔，但不要过大。
5. **增加层次感**：在深度解读中加入多个段落，每个段落阐述不同的角度或维度。

目标输出结构如下：

## 星辰的启示
> (请用一段充满诗意、神秘的箴言作为开场，放在引用块中。这段话应该是对整个占卜的总体指引。)

## 往昔之影 - ${cards[0].name} ${cards[0].isReversed ? '(逆位)' : '(正位)'}
### 核心象征
(用简练的语言列出3-5个关键词或象征物，用逗号分隔)

### 深度解读
(第一段：详细解读这张牌在过去位置的含义，说明它如何塑造了你的现在。对**关键洞察**进行加粗。)

(第二段：分析这张牌的具体影响，可能涉及的人生事件或心理状态。)

(第三段：如果是逆位，特别说明逆位的含义；如果是正位，强调其正面力量。)

## 当下之光 - ${cards[1].name} ${cards[1].isReversed ? '(逆位)' : '(正位)'}
### 核心象征
(用简练的语言列出3-5个关键词或象征物，用逗号分隔)

### 深度解读
(第一段：详细解读现状，说明你当前面临的核心能量或挑战。对**关键洞察**进行加粗。)

(第二段：分析这张牌与过去牌的关联，说明如何从过去演变到现在。)

(第三段：指出当前的机遇与挑战，以及需要注意的平衡点。)

## 未来回响 - ${cards[2].name} ${cards[2].isReversed ? '(逆位)' : '(正位)'}
### 核心象征
(用简练的语言列出3-5个关键词或象征物，用逗号分隔)

### 深度解读
(第一段：预测未来趋势，说明这张牌指向的可能发展方向。对**关键洞察**进行加粗。)

(第二段：分析这个未来与现在的关系，说明需要采取什么行动才能实现这个未来。)

(第三段：给出警示或希望，根据牌的性质提供前瞻性的建议。)

## 现实行动指南
(此处必须摒弃模棱两可的废话。请给出生活中立刻可以执行的具体微小行动。每个建议都要具体、可行、有时间框架。)

- **具体行动**：(拒绝抽象建议。请给出24小时内可以立即执行的一件具体小事。例如："今天下午花15分钟整理书桌左侧的文件"、"在今晚给某位朋友发一条感谢短信"、"明天早上清理手机相册中的重复照片"等。要包含具体的时间和地点。)

- **避坑指南**：(指出近期现实生活中可能遇到的具体麻烦或误区，而非心理状态。例如："签署任何文件前多看两遍条款"、"避免在晚上做出重大决定，最好在早晨重新评估"、"与他人沟通时先听后说，避免仓促回应"等。)

- **思维转换**：(用心理学视角给出一句具体的自我对话或认知重构的方法。例如："当感到困顿时，提醒自己'这是成长的必要过程，而非失败的信号'"、"用'我正在学习'替代'我做不到'"等。)

- **日常仪式**：(推荐一个不涉及迷信、但在心理暗示上有效的日常小动作。例如："每天早晨喝第一杯水时深呼吸三次，设定今天的意图"、"出门前花30秒整理自己的仪容，这会增强自信心"、"每晚睡前写下今天的一个收获"等。)

## 命运箴言
> (一句简短有力、直击灵魂的总结句，作为整场占卜的注脚。这句话应该是对整个占卜的精髓总结，给人以启发和力量。)`;
};

/**
 * Generate a fallback reading based on card meanings
 */
const generateFallbackReading = (cards: DrawnCard[]): string => {
  const getCardMeaning = (card: DrawnCard): string => {
    return card.isReversed ? card.meaningReversed : card.meaningUpright;
  };

  const cardMeanings = cards.map(c => ({
    name: c.name,
    meaning: getCardMeaning(c),
    isReversed: c.isReversed
  }));

  return `## 星辰的启示
> 虽然虚空的声音暂时沉寂，但卡牌的智慧依然闪耀。这三张牌为你指引方向，每一张都承载着深层的意义。

## 往昔之影 - ${cards[0].name} ${cards[0].isReversed ? '(逆位)' : '(正位)'}
### 核心象征
${cardMeanings[0].meaning}

### 深度解读
这张牌在你的过去中代表了 **${cardMeanings[0].meaning}**。它反映了你曾经经历的关键时刻，塑造了你今天的样子。

在那个时期，你可能经历了与这张牌相关的重要事件或心理转变。这些经历虽然已成过往，但它们的影响依然深远，继续影响着你当下的选择和态度。

${cardMeanings[0].isReversed ? '这张牌的逆位表明，过去的某些挑战或阻碍已经逐渐消散，或者你已经学会了如何应对这些困难。' : '这张牌的正位表明，过去的这段经历为你带来了积极的力量和宝贵的经验。'}

## 当下之光 - ${cards[1].name} ${cards[1].isReversed ? '(逆位)' : '(正位)'}
### 核心象征
${cardMeanings[1].meaning}

### 深度解读
在当下，你面临的核心能量是 **${cardMeanings[1].meaning}**。这是你现在需要关注和理解的关键力量。

这张牌揭示了你当前的处境、你正在经历的挑战，以及你拥有的资源。它提示你，现在是采取行动或做出重要决定的时刻。

${cardMeanings[1].isReversed ? '这张牌的逆位表明，你可能正在经历某种阻碍或内在的冲突。这是一个需要反思和调整的时期。' : '这张牌的正位表明，你拥有充足的能量和资源来应对当前的局面。这是一个充满可能性的时刻。'}

## 未来回响 - ${cards[2].name} ${cards[2].isReversed ? '(逆位)' : '(正位)'}
### 核心象征
${cardMeanings[2].meaning}

### 深度解读
未来向你展示了 **${cardMeanings[2].meaning}** 的可能性。这是你前进道路上的指引。

这张牌预示着你的发展方向，以及如果你继续当前的路径会发生什么。它不是绝对的命运，而是一种可能性——你的选择和行动会影响这个未来的实现。

${cardMeanings[2].isReversed ? '这张牌的逆位提示你，未来可能充满挑战，但这也是成长的机会。保持警觉和灵活性。' : '这张牌的正位预示着一个积极的未来。继续你当前的努力，相信你的直觉。'}

## 现实行动指南
- **具体行动**：花10分钟整理你的工作空间或生活环境，清除一件不需要的物品。这个简单的行动会帮助你重新获得掌控感。

- **避坑指南**：避免在情绪波动时做出重大决定。给自己至少24小时的冷静期，然后再重新评估。

- **思维转换**：提醒自己"我有能力应对眼前的挑战，每一个困难都是成长的机会"。

- **日常仪式**：每天早晨深呼吸三次，在心中设定今天的意图。这个简单的仪式会帮助你保持专注和平静。

## 命运箴言
> 星辰已指引方向，余下的取决于你的选择。相信你的直觉，采取行动，未来掌握在你手中。`;
};
