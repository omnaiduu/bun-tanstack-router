async function om(){
                try{
                   
                    var url = "/resume"
                    var res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: ${JSON.stringify(jsonBody)}
                    });
    if (!res.ok) return;
    
    
   
   
    
   
   
    
   

                }catch(e){console.error('Inline resume failed',e)}
            }