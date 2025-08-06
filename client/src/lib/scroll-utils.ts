/**
 * Simple scroll utility - render, listen, scroll
 */

export const smartScroll = (options: {
  scrollBottom?: boolean;
  hasSelectiveAction?: boolean;
  hasPrimaryEvent?: boolean;
} = {}) => {
  const container = document.getElementById('messages-container');
  if (!container) return;

  const { scrollBottom, hasSelectiveAction, hasPrimaryEvent } = options;

  // Rule 1: Scroll to bottom
  if (scrollBottom) {
    container.scrollTop = container.scrollHeight;
    return;
  }

  // Rule 2: Scroll to selective actions
  if (hasSelectiveAction) {
    const element = container.querySelector('[data-selective-actions]') as HTMLElement;
    if (element) {
      container.scrollTop = element.offsetTop - 64 - 10;
    }
    return;
  }

  // Rule 3: Scroll to primary events
  if (hasPrimaryEvent) {
    const element = container.querySelector('[data-primary-event]') as HTMLElement;
    if (element) {
      container.scrollTop = element.offsetTop - 64 - 10;
    }
    return;
  }

  // Default: scroll to bottom
  container.scrollTop = container.scrollHeight;
};

/**
 * Detect if selective actions are rendered based on tool configuration
 */
export const hasSelectiveRendering = (toolConfig?: { hasSelectiveActions?: boolean }): boolean => {
  // Database configuration is ALWAYS the source of truth - ignore DOM if config exists
  if (toolConfig?.hasSelectiveActions !== undefined) {
    return toolConfig.hasSelectiveActions;
  }
  
  // Only use DOM detection as absolute fallback when no config provided
  const container = document.getElementById('messages-container');
  if (!container) return false;
  return !!container.querySelector('[data-selective-actions]');
};

/**
 * Detect if primary events are rendered - pure DOM detection
 */
export const hasPrimaryRendering = (): boolean => {
  const container = document.getElementById('messages-container');
  if (!container) return false;
  return !!container.querySelector('[data-primary-event]') || !!container.querySelector('[data-tool-output]');
};

/**
 * Comprehensive logging framework for scroll system analysis
 */
const logScrollAnalysis = (data: {
  tool?: string;
  rule: string;
  existingAircraftSelected: boolean;
  targetScrollContainerToken?: string;
  targetScrollContainer?: string;
  targetScrollContainerPosition?: number;
  scrollingMath?: string;
  expectedScrollResult: string;
  domRenderingRuleDecision: string;
  domRenderingListenerStatus: string;
  domRenderingTiming: number;
  actualScrollResult?: string;
  numberOfScrolls: number;
  summaryOfOtherLogic: string[];
}) => {
  console.group('🚀 SCROLL SYSTEM ANALYSIS');
  console.log('📊 Tool:', data.tool || 'Unknown');
  console.log('📏 Rule:', data.rule);
  console.log('✈️ Existing Aircraft Selected:', data.existingAircraftSelected);
  console.log('🎯 Target Scroll Container Token:', data.targetScrollContainerToken || 'None');
  console.log('📦 Target Scroll Container:', data.targetScrollContainer || 'None');
  console.log('📐 Target Scroll Container Position:', data.targetScrollContainerPosition || 'N/A');
  console.log('🧮 Scrolling Math:', data.scrollingMath || 'N/A');
  console.log('🎯 Expected Scroll Result:', data.expectedScrollResult);
  console.log('🔧 DOM Rendering Rule Decision:', data.domRenderingRuleDecision);
  console.log('⏱️ DOM Rendering Listener Status:', data.domRenderingListenerStatus);
  console.log('⏰ DOM Rendering Timing:', data.domRenderingTiming + 'ms');
  console.log('✅ Actual Scroll Result:', data.actualScrollResult || 'Pending');
  console.log('🔢 Number of Scrolls:', data.numberOfScrolls);
  console.log('📝 Summary of Other Logic:', data.summaryOfOtherLogic.join(', '));
  console.groupEnd();
};

export const autoSmartScroll = (
  targetToken: string, 
  toolConfig?: { hasSelectiveActions?: boolean }, 
  toolName?: string
) => {
  const container = document.getElementById('messages-container');
  if (!container) return;

  const hasSelectiveActionRendering = hasSelectiveRendering(toolConfig);

  // DOM-based conditional listener: Wait for all rendering to complete
  const observer = new MutationObserver(() => {
    if (hasSelectiveActionRendering) {
      // Rule 2: Conditional container targeting - Selective Actions
      const selectiveElement = container.querySelector('[data-selective-actions]') as HTMLElement;
      if (selectiveElement) {
        // Token-based scrolling within selective actions
        const tokenElement = container.querySelector(`[data-selective-actions*="${targetToken}"]`);
        const targetElement = tokenElement || selectiveElement;
        
        // Rule 2: Scroll to position selective actions content properly below tool buttons
        const scrollPosition = Math.max(0, (targetElement as HTMLElement).offsetTop - 74);
        container.scrollTop = scrollPosition;
        
        logScrollAnalysis({
          tool: toolName,
          rule: 'Rule 2: Selective Actions + Token',
          existingAircraftSelected: false,
          targetScrollContainerToken: targetToken,
          targetScrollContainer: tokenElement ? 'Token in Selective Actions' : '[data-selective-actions]',
          targetScrollContainerPosition: scrollPosition,
          scrollingMath: `Token positioning = ${scrollPosition}`,
          expectedScrollResult: 'Token-based scroll to selective actions',
          domRenderingRuleDecision: 'Selective: true, Primary: false',
          domRenderingListenerStatus: 'All renderers complete',
          domRenderingTiming: 0,
          actualScrollResult: `Scrolled to position ${scrollPosition}`,
          numberOfScrolls: 1,
          summaryOfOtherLogic: ['Wait for all rendering, token-based selective actions targeting']
        });
        
        observer.disconnect();
      }
    } else {
      // Rule 3: Conditional container targeting - Primary Actions  
      const primaryElement = container.querySelector('[data-primary-event]') as HTMLElement;
      if (primaryElement) {
        // Token-based scrolling within primary actions
        const tokenElement = container.querySelector(`[data-tool-output="${targetToken}"]`);
        const targetElement = tokenElement || primaryElement;
        
        // Rule 3: Scroll token to top minus header offset
        const scrollPosition = Math.max(0, (targetElement as HTMLElement).offsetTop - 74);
        container.scrollTop = scrollPosition;
        
        logScrollAnalysis({
          tool: toolName,
          rule: 'Rule 3: Primary Actions + Token',
          existingAircraftSelected: false,
          targetScrollContainerToken: targetToken,
          targetScrollContainer: tokenElement ? 'Token in Primary Actions' : '[data-primary-event]',
          targetScrollContainerPosition: scrollPosition,
          scrollingMath: `Token positioning = ${scrollPosition}`,
          expectedScrollResult: 'Token-based scroll to primary actions',
          domRenderingRuleDecision: 'Selective: false, Primary: true',
          domRenderingListenerStatus: 'All renderers complete',
          domRenderingTiming: 0,
          actualScrollResult: `Scrolled to position ${scrollPosition}`,
          numberOfScrolls: 1,
          summaryOfOtherLogic: ['Wait for all rendering, token-based primary actions targeting']
        });
        
        observer.disconnect();
      }
    }
  });

  // Start observing
  observer.observe(container, { childList: true, subtree: true });
  
  // Clean up observer after 2 seconds
  setTimeout(() => {
    observer.disconnect();
  }, 2000);
};

export const isNearBottom = (containerId = 'messages-container', threshold = 400): boolean => {
  const container = document.getElementById(containerId);
  if (!container) return true;
  const { scrollTop, scrollHeight, clientHeight } = container;
  return scrollTop + clientHeight + threshold >= scrollHeight;
};

export const addScrollListener = (callback: () => void): (() => void) => {
  const container = document.getElementById('messages-container');
  if (!container) return () => {};
  container.addEventListener('scroll', callback);
  return () => container.removeEventListener('scroll', callback);
};