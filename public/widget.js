(function() {
  // Don't run inside iframe (prevents infinite loop when widget is on same domain)
  if (window.self !== window.top) {
    return;
  }

  // Check if we're on an excluded page
  const excludedPaths = ['/admin', '/login', '/onboarding', '/invite', '/transfer', '/widget'];
  const isExcludedPath = (path) => excludedPaths.some(excluded => path.startsWith(excluded));

  // Hide widget on excluded pages, show on others
  function updateWidgetVisibility() {
    const widgetIframe = document.getElementById('botsy-widget-iframe');
    if (widgetIframe) {
      if (isExcludedPath(window.location.pathname)) {
        widgetIframe.style.display = 'none';
      } else {
        widgetIframe.style.display = '';
      }
    }
  }

  // Don't create widget on excluded pages, but still set up listeners
  if (isExcludedPath(window.location.pathname)) {
    // Set up navigation listeners even on excluded pages
    window.addEventListener('popstate', updateWidgetVisibility);
    let lastUrl = window.location.href;
    const observer = new MutationObserver(function() {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        updateWidgetVisibility();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return;
  }

  // Find the Botsy script element
  const scripts = document.getElementsByTagName('script');
  let script = null;
  let companyId = null;

  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('widget.js')) {
      script = scripts[i];
      companyId = script.getAttribute('data-company-id');
      break;
    }
  }

  if (!companyId) {
    console.error('Botsy: Missing data-company-id attribute');
    return;
  }

  // Get the base URL from the script src
  const scriptSrc = script.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

  // Prevent duplicate widgets
  if (document.getElementById('botsy-widget-iframe')) {
    return;
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'botsy-widget-iframe';
  iframe.src = baseUrl + '/widget/' + companyId + '?t=' + Date.now();
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('allow', 'clipboard-write');

  let position = 'right';
  let chatIsOpen = false;
  let widgetSize = 'medium';

  // Size dimensions matching the widget settings
  const SIZE_DIMENSIONS = {
    small: { width: 360, height: 480 },
    medium: { width: 400, height: 540 },
    large: { width: 440, height: 620 },
  };

  // Small size for just the button (56px button + padding for shadow)
  const setClosedStyle = () => {
    iframe.style.cssText = `
      position: fixed;
      bottom: 8px;
      ${position === 'bottom-left' ? 'left: 8px;' : 'right: 8px;'}
      width: 72px;
      height: 72px;
      border: none;
      outline: none;
      background: transparent;
      z-index: 999999;
      overflow: visible;
      color-scheme: normal;
    `;
  };

  // Expanded for open chat
  const setOpenStyle = () => {
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      iframe.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        background: transparent;
        z-index: 999999;
      `;
    } else {
      const size = SIZE_DIMENSIONS[widgetSize] || SIZE_DIMENSIONS.medium;
      iframe.style.cssText = `
        position: fixed;
        bottom: 0;
        ${position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
        width: ${size.width}px;
        height: ${size.height}px;
        border: none;
        outline: none;
        background: transparent;
        z-index: 999999;
        border-radius: 0;
      `;
    }
  };

  // Start closed
  setClosedStyle();
  document.body.appendChild(iframe);

  // Listen for messages from iframe
  let closeTimeout = null;

  window.addEventListener('message', function(event) {
    if (!event.data) return;

    if (event.data.type === 'botsy-state') {
      // Clear any pending close timeout
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }

      chatIsOpen = event.data.isOpen;
      if (chatIsOpen) {
        setOpenStyle();
      } else {
        // Delay shrinking iframe to allow exit animation to complete
        closeTimeout = setTimeout(setClosedStyle, 250);
      }
    }

    if (event.data.type === 'botsy-position') {
      position = event.data.position || 'right';
      if (!chatIsOpen) {
        setClosedStyle();
      } else {
        setOpenStyle();
      }
    }

    if (event.data.type === 'botsy-size') {
      widgetSize = event.data.size || 'medium';
      if (chatIsOpen) {
        setOpenStyle();
      }
    }
  });

  // Handle resize
  window.addEventListener('resize', function() {
    if (chatIsOpen) {
      setOpenStyle();
    }
  });

  // Handle client-side navigation (for Next.js/React apps)
  // Listen for popstate (back/forward navigation)
  window.addEventListener('popstate', updateWidgetVisibility);

  // Use MutationObserver to detect URL changes (for pushState/replaceState)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      updateWidgetVisibility();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
