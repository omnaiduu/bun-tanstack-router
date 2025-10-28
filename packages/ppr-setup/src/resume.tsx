import {  type AnyRouter } from "@tanstack/react-router";
import { createRequestHandler } from "@tanstack/router-core/ssr/server";
import { cache } from "./cache";
import { resume } from "react-dom/server";
import { RouterServer } from "@tanstack/react-router/ssr/server";
import { createRouter } from "./router";
export async function resumeStream({
    request,
    
   
}: {
        request: Request,
     
        
    }) {
     
    console.log('Resume request received');

    

    
    
            const reqBody = await request.json();
            const path = reqBody.path;
            const origin = new URL(request.url).origin 
            console.log('REQUEST ORIGIN:', origin);
    
            const req = new Request(`${origin}${path}`, {
                method: "GET"
            });
        const handler = createRequestHandler({
            request: req,
            createRouter,
            })
    
            return handler(async ({ router, responseHeaders }) => {
                console.log('Resume request for path:', path);
                if (!cache.has(path)) {
                    console.log('No cached content for path:', path);
                    return new Response("Not Found", { status: 404 });
                }
                const existingContent = cache.get(path)!;
                console.log('Serving resumed content for path:', path, existingContent);
                const resumed = await resume(<RouterServer router={router} />, JSON.parse(existingContent));
                return new Response(resumed, {
                    status: 200 ,
                    headers: responseHeaders
                });
    
             })
        
}