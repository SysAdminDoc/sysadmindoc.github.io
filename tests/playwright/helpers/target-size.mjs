export const desktopTargetSizeMinimum = 24;
export const mobileTargetSizeMinimum = 44;

export function targetSizeMinimumForWidth(width) {
  return width <= 640 ? mobileTargetSizeMinimum : desktopTargetSizeMinimum;
}

export async function collectTargetSizeViolations(page, minimum) {
  return page.evaluate((minimum) => {
    const selector = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      'summary',
      'label[for]',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const pageTargets = Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
        if (element.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
        if (element.classList.contains('sr-only')) return false;
        if ('disabled' in element && element.disabled) return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        const isVisuallyHidden = style.position === 'absolute'
          && rect.width <= 1
          && rect.height <= 1
          && (style.overflow === 'hidden' || style.clip !== 'auto' || style.clipPath !== 'none');
        if (isVisuallyHidden) return false;
        return element.getClientRects().length > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const after = window.getComputedStyle(element, '::after');
        const label = element.closest('label')
          ?? (element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null);
        const labelRect = label?.getBoundingClientRect();
        return {
          element,
          rect: {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY,
            width: rect.width,
            height: rect.height,
          },
          display: style.display,
          lineHeight: Number.parseFloat(style.lineHeight) || rect.height,
          stretched: after.position === 'absolute'
            && after.top === '0px'
            && after.right === '0px'
            && after.bottom === '0px'
            && after.left === '0px',
          labeledTarget: Boolean(labelRect && labelRect.width >= minimum && labelRect.height >= minimum),
        };
      })
      .filter((target) => target.rect.width > 0 && target.rect.height > 0);

    function cssPath(element) {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const parts = [];
      let node = element;
      while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body && parts.length < 4) {
        const tag = node.tagName.toLowerCase();
        const className = Array.from(node.classList).slice(0, 2).map((name) => `.${CSS.escape(name)}`).join('');
        const parent = node.parentElement;
        const index = parent ? Array.from(parent.children).filter((child) => child.tagName === node.tagName).indexOf(node) + 1 : 1;
        parts.unshift(`${tag}${className}:nth-of-type(${index})`);
        node = parent;
      }
      return parts.join(' > ');
    }

    function isInlineException(target) {
      if (!target.element.matches('a[href]')) return false;
      const inTextFlow = target.element.closest('p,li,dd,blockquote,figcaption,td');
      if (!inTextFlow) return false;
      return target.display === 'inline' || target.rect.height <= target.lineHeight + 4;
    }

    function circleIntersectsRect(circle, rect) {
      const closestX = Math.max(rect.left, Math.min(circle.x, rect.right));
      const closestY = Math.max(rect.top, Math.min(circle.y, rect.bottom));
      return (circle.x - closestX) ** 2 + (circle.y - closestY) ** 2 < circle.r ** 2;
    }

    function passesSpacingException(target, index) {
      const circle = {
        x: target.rect.left + target.rect.width / 2,
        y: target.rect.top + target.rect.height / 2,
        r: minimum / 2,
      };
      return pageTargets.every((other, otherIndex) => {
        if (otherIndex === index) return true;
        if (other.rect.width < minimum || other.rect.height < minimum) {
          const otherCircle = {
            x: other.rect.left + other.rect.width / 2,
            y: other.rect.top + other.rect.height / 2,
          };
          return Math.hypot(circle.x - otherCircle.x, circle.y - otherCircle.y) >= minimum;
        }
        return !circleIntersectsRect(circle, other.rect);
      });
    }

    return pageTargets.flatMap((target, index) => {
      if (target.rect.width >= minimum && target.rect.height >= minimum) return [];
      if (target.stretched) return [];
      if (target.labeledTarget) return [];
      if (isInlineException(target)) return [];
      if (passesSpacingException(target, index)) return [];
      return [{
        selector: cssPath(target.element),
        text: target.element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
        width: Number(target.rect.width.toFixed(1)),
        height: Number(target.rect.height.toFixed(1)),
        exception: 'none',
      }];
    });
  }, minimum);
}
