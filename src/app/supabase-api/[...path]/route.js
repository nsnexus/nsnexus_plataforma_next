export const runtime = 'edge';

export async function GET(request, { params }) {
  return handleRequest(request, params);
}

export async function POST(request, { params }) {
  return handleRequest(request, params);
}

export async function PUT(request, { params }) {
  return handleRequest(request, params);
}

export async function PATCH(request, { params }) {
  return handleRequest(request, params);
}

export async function DELETE(request, { params }) {
  return handleRequest(request, params);
}

export async function OPTIONS(request, { params }) {
  return handleRequest(request, params);
}

async function handleRequest(request, params) {
  const url = new URL(request.url);
  const pathParams = await params;
  const path = pathParams.path.join('/');
  
  // Construct destination URL to Supabase
  const destinationUrl = `https://xdejjgeigrbsbkqakari.supabase.co/${path}${url.search}`;
  
  // Copy request headers, ignoring host to prevent SSL/SNI conflicts
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  }
  
  // Read body for writing methods
  let body = null;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    try {
      body = await request.clone().arrayBuffer();
    } catch (e) {
      // Body reading failed (e.g. empty body)
    }
  }
  
  try {
    const response = await fetch(destinationUrl, {
      method: request.method,
      headers: headers,
      body: body,
      redirect: 'manual' // crucial to forward OAuth 302 redirects back to the browser
    });
    
    // Copy response headers
    const responseHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      // Exclude some headers that might conflict
      if (key.toLowerCase() !== 'content-encoding') {
        responseHeaders.set(key, value);
      }
    }
    
    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("Supabase edge proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
