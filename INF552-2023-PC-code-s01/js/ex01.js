const ctx = {
    SVG_NS: "http://www.w3.org/2000/svg",
    DEFAULT_POINT_COUNT: 20,
    GLYPH_SIZE: 12,
    w: 480,
    h: 480,
};

function createViz(){
    /* Method called automatically when the HTML page has finished loading. */
    // ...
    // create svg element
    var svg = document.createElementNS(ctx.SVG_NS, "svg");
    svg.setAttribute("id", "svg");
    svg.setAttribute("width", ctx.w);
    svg.setAttribute("height", ctx.h);
    document.getElementById("main").appendChild(svg);
};

function handleKeyEvent(e){
    /* Callback triggered when any key is pressed in the input text field.
       e contains data about the event.
       visit http://keycode.info/ to find out how to test for the right key value */

    // check if key is enter
    if(e.key === 'Enter'){
        set();
        e.preventDefault();
    }
};

function set(){
    /* Callback triggered when the "Set" button is clicked. */
    // ...
    // set point in the svg element
    var e_target = document.getElementById("countTf");
    var svg = document.getElementById("svg");
    while(svg.firstChild){
        svg.removeChild(svg.firstChild);
    }
    // set points
    var svg = document.getElementById("svg");
    var choice = document.getElementById("searchType").value;
    var g_element = document.createElementNS(ctx.SVG_NS, "g");
    // create diffferent points based on choice
    if(choice == "color"){
        for(var i = 0; i < e_target.value; i++){
            var point = document.createElementNS(ctx.SVG_NS, "circle");
            point.setAttribute("fill", "blue");
            if (i == 0){
                point.setAttribute("fill", "red");
            }
            var x = Math.floor(Math.random() * ctx.w);
            var y = Math.floor(Math.random() * ctx.h);
            point.setAttribute("cx", x);
            point.setAttribute("cy", y);
            point.setAttribute("r", 5);
            g_element.appendChild(point);
        }
    }
    else if(choice == "shape"){
        for(var i = 0; i < e_target.value; i++){
            var x = Math.floor(Math.random() * ctx.w);
            var y = Math.floor(Math.random() * ctx.h);
            if (i == 0){
                var point = document.createElementNS(ctx.SVG_NS, "circle");
                point.setAttribute('cx', x);
                point.setAttribute('cy', y);
                point.setAttribute('r', 5);
            }
            else{
                var point = document.createElementNS(ctx.SVG_NS, "rect");
                point.setAttribute('x', x);
                point.setAttribute('y', y);
                point.setAttribute('width', 8);
                point.setAttribute('height', 8);
            }
            point.setAttribute("fill", "red");
            g_element.appendChild(point);
        }
    }
    else{
        for(var i = 0; i < e_target.value; i++){
            var x = Math.floor(Math.random() * ctx.w);
            var y = Math.floor(Math.random() * ctx.h);
            var point = document.createElementNS(ctx.SVG_NS, "rect");
            if (i%2 == 0){
                var point = document.createElementNS(ctx.SVG_NS, "circle");
                if (i == 0){
                    point.setAttribute("fill", "red");
                }
                else{
                    point.setAttribute("fill", "blue");
                }
                point.setAttribute('cx', x);
                point.setAttribute('cy', y);
                point.setAttribute('r', 5);
            }
            else{
                var point = document.createElementNS(ctx.SVG_NS, "rect");
                point.setAttribute("fill", "red");
                point.setAttribute('x', x);
                point.setAttribute('y', y);
                point.setAttribute('width', 8);
                point.setAttribute('height', 8);
            }
            g_element.appendChild(point);
        }
    }
    svg.appendChild(g_element);
    // hold the page when enter is pressed
};
