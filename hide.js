





(function() {
    
    var mathOverlay = document.createElement('div');
    mathOverlay.id = 'math-flash-overlay';
    
    
    Object.assign(mathOverlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Verdana, sans-serif',
        transition: 'opacity 0.5s ease-out',
        textAlign: 'center'
    });

    
    mathOverlay.innerHTML = `
        <div style="background: #ff7a00; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,150,0.15); max-width: 600px; border: 1px solid #d6dbff;">
            <h2 style="color: #333; margin-top: 0;">Math Formulas Quick Reference</h2>
            
            <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: normal; color: #555;">The Quadratic Formula</h3>
                <div style="font-family: 'Courier New', monospace; font-size: 18px; background: #eef; padding: 12px; border-radius: 6px; font-weight:bold;">x = [-b &plusmn; &radic;(b&sup2; - 4ac)] / 2a</div>
            </div>
            
            <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: normal; color: #555;">Pythagorean Theorem</h3>
                <div style="font-family: 'Courier New', monospace; font-size: 18px; background: #eef; padding: 12px; border-radius: 6px; font-weight:bold;">a&sup2; + b&sup2; = c&sup2;</div>
            </div>

            <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: normal; color: #555;">Euler's Identity</h3>
                <div style="font-family: 'Courier New', monospace; font-size: 18px; background: #eef; padding: 12px; border-radius: 6px; font-weight:bold;">e<sup>i&pi;</sup> + 1 = 0</div>
            </div>
        </div>
    `;

    
    document.body.appendChild(mathOverlay);
    document.body.style.overflow = 'hidden'; 

    
    setTimeout(function() {
        mathOverlay.style.opacity = '0'; 
        
        
        setTimeout(function() {
            mathOverlay.remove(); 
            document.body.style.overflow = ''; 
        }, 500); 
        
    }, 3000); 


    
    
    
    
    var Quotation = [
        'I just want to say a very BIG thank you for this wonderful site. I am using it to refresh my math skills and to teach my kids maths. Once again thank you very very much for making mathematics as simple as A B C bravo',
        'You guys have created an amazing website. I have been using it for years to understand math concepts. The quizzes really help solidify the content, and everything is thoroughly explained. Thanks for all you do!',
        'I have a PhD in Computer Science but occasionally access your website for a good refresher. Thanks a lot for your quality content!',
        '... I love you so much because I have a 20 in math right now so your website really help me out.',
        'This is one of the best math websites!  Your expertise is very much appreciated!',
        'I just discovered your site and used it to help me solve a spreadsheet problem.  Explanations here are brilliant.',
        'Normally I never do these sorts of things. But Math is Fun, let me tell you, that the content on your Matrices page was far more helpful than my college textbook.',
        'Amazing! I have never seen a site making math so much fun and easy to understand. Why isn`t it taught like this in schools? Thank you all!'
    ];

    Array.prototype.shuffle = function() {
        var i = this.length, j, temp;
        if ( i == 0 ) return this;
        while ( --i ) { 
            j = Math.floor( Math.random() * ( i + 1 ) ); 
            temp = this[i];
            this[i] = this[j];
            this[j] = temp;
        }
        return this;
    }

    Quotation.shuffle();

    var alpha = 1;
    var alphaTgt = 0;
    var quoteNo = 0;

    function rotateMe() {
        alpha = alpha * 0.8 + alphaTgt * 0.2;
        
        if (alpha > 0.9999) alphaTgt = 0;
        
        if (alpha < 0.1) {
            alphaTgt = 1;
            var textRotator = document.getElementById('textrotator');
            if (textRotator) {
                textRotator.innerHTML = ' &nbsp; &nbsp; "' + Quotation[quoteNo] + '"';
            }
            
            quoteNo++;
            if (quoteNo > Quotation.length - 1) quoteNo = 0;
        }
        
        var rotatorStyle = document.getElementById('textrotator');
        if (rotatorStyle) {
            rotatorStyle.style.opacity = alpha;
        }
        
        setTimeout(rotateMe, 100);
    }

    
    if (document.getElementById('textrotator')) {
        rotateMe();
    }
})();