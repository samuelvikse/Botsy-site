import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get the host from the request to build the correct URL
  const host = request.headers.get('host') || 'botsy.no'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const script = `
(function() {
  // Find the script tag to get the company ID
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var companyId = currentScript.getAttribute('data-company-id');

  if (!companyId) {
    console.error('Botsy: Mangler data-company-id attributt');
    return;
  }

  // Configuration
  var config = {
    baseUrl: '${baseUrl}',
    companyId: companyId,
    position: currentScript.getAttribute('data-position') || 'bottom-right'
  };

  // Create container
  var container = document.createElement('div');
  container.id = 'botsy-widget-container';
  container.style.cssText = 'position: fixed; z-index: 999999; ' +
    (config.position.includes('bottom') ? 'bottom: 0;' : 'top: 0;') +
    (config.position.includes('right') ? 'right: 0;' : 'left: 0;') +
    'width: 400px; height: 600px; max-width: 100vw; max-height: 100vh; pointer-events: none;';

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'botsy-widget-iframe';
  iframe.src = config.baseUrl + '/widget/' + config.companyId;
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent; pointer-events: auto;';
  iframe.allow = 'clipboard-write';

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Handle messages from iframe
  window.addEventListener('message', function(event) {
    if (event.data.type === 'botsy-state') {
      // Adjust container size based on chat state
      if (event.data.isOpen) {
        container.style.width = '400px';
        container.style.height = '600px';
      } else {
        container.style.width = '80px';
        container.style.height = '80px';
      }
    }
  });

  // Start with minimized size
  container.style.width = '80px';
  container.style.height = '80px';

  console.log('Botsy widget loaded for company:', config.companyId);
})();
`

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
