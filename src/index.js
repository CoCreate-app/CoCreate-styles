
HTMLElement.prototype.setCCStyle = function (property, newValue){
    let styleMap = new Map();
    for(let classname of this.classList )
    {
      let [name, value] = classname.split(":");
      if(name === property){
        this.classList.replace(classname, name + ':' + newValue)
        break;
      }
    }
}


HTMLElement.prototype.getCCStyle = function (property){
    let styleMap = new Map();
    for(let classname of this.classList)
    {
      let [name, value] = classname.split(":");
      if(name === property){
        return value;
      }
    }
}




let canvas = document.querySelector("#canvas").contentDocument;
let inputs = document
  .getElementById("domEditorPanel")
  .querySelectorAll("input");


let inputsMeta = [];
inputs.forEach(input => {
  ;
  let dataAttribute = input.getAttribute("data-style");
  if(!dataAttribute) return;
  dataAttribute = dataAttribute.toLowerCase();
  let dataProperty = input.getAttribute("data-style_property");
  inputsMeta.push({
    input,
    dataAttribute,
    dataProperty
  })
})

function parseUnit(style)
{
    let value = parseInt(style);
    let valueLength = (value + '').length;
    if(valueLength) 
      return [value, style.substr(valueLength) || 'none']
    return undefined;
}


(()=>{
  // todo: 
  // updates the inputs on collaboration when the real element coCreateStyle is change
  const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'attributes') {
          let name = mutation.attributeName;
        
        if(name === 'class')
        {
          let target = mutation.target;
          
          let coCreateStyle = getCoCreateStyle(target.classList);
          inputsMeta.forEach(inputMeta => {
            let {input, dataAttribute, dataProperty} = inputMeta;
            let selector = input.getAttribute('data-style_target');
            let selectedElement = document.querySelector(selector);
            let elementId = target.getAttribute('data-element_id');
            if(selectedElement !== elementId) return;
            let style = coCreateStyle[dataProperty]
            if(style)
            {
              let [value, unit] = parseUnit(style)
              if(input.getAttribute('data-style_unit') === unit) return;
              input.value = value
              input.setAttribute('data-style_unit', unit )
            }
          })
        }
      }

    }
  };

  const observer = new MutationObserver(callback);
  const config = { attributes: true, childList: false, subtree: true };
  observer.observe(canvas, config);

  
})();

(()=>{
  // update the element coCreateStyle unit from input
  const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'attributes') {
        let input = mutation.target;
        let name = mutation.attributeName;
        
        let dataProperty = input.getAttribute('data-style_property');
        let dataAttribute = input.getAttribute('data-style');
        
        if(dataAttribute && dataProperty && name === 'data-style_unit')
        {
          
          let unit = input.getAttribute(name);
          let selector = input.getAttribute('data-style_target');
          let elementId = document.querySelector(selector);;
          let element = canvas.querySelector(`[data-element_id="${elementId}"]`);
          let coCreateCss = getCoCreateStyle(element.classList);
          let oldStyle = coCreateCss[dataProperty];
          if(!oldStyle) return;
          let [value, oldUnit] = parseUnit(oldStyle);
          if(unit === oldUnit ) return;
          
          let newStyles = value + unit; 
          
          
          let newClass = dataProperty + ":" + newStyles;
          let oldClass = dataProperty + ":" + oldStyle;
          let payload = [{
            target: elementId,
            method: 'classList.remove',
            value: [oldClass]
          },
          {
            target: elementId,
            method: 'classList.add',
            value: [newClass]
          }];
          
          let broadcast = {
            broadcast_sender: true,
            rooms: "",
            emit: {
              message: "inputChange",
              data: payload,
            },
          };
          CoCreate.sendMessage(broadcast);
        }
      }

    }
  };

  const observer = new MutationObserver(callback);
  const config = { attributes: true, childList: false, subtree: true };
  observer.observe(document.body, config);
})()



CoCreateSocket.listen("inputChange", function (data) {
  console.log(
    "raw object recieved: ",
    data,
    window.location.pathname
  );
  if(!Array.isArray(data))
    data = [data]
  // resolving the element_id to real element in the clinet
  // if (input1.getAttribute("data-target") == data.target)
  // input1.setAttribute("value", data.value[1]);

  data.forEach(action => {
    action.target = canvas.querySelector(`[data-element_id=${action.target}]`);
    domEditor(action);
  })


  // passing it to domEditor
});


// todo: 1. refactor it into separate , 2. use context
canvas.addEventListener("click", (e) => {
  let element = e.target;
  let computedStyles = window.getComputedStyle(element);



  inputsMeta.forEach((inputMeta) => {
    
    let {input, dataAttribute, dataProperty} = inputMeta;
    
    

    let payloadGenerator;
    let elementId = element.getAttribute("data-element_id");


    switch (dataAttribute) {
      case "classstyle":


        let coCreateCss = getCoCreateStyle(element.classList);
 
        
        let style = coCreateCss[dataProperty];
        if(!style)
          style = computedStyles[dataProperty];
        let [value, unit] = parseUnit(style)

        input.value = value;
        input.setAttribute('data-style_unit', unit)
        
        payloadGenerator = (value) => {
          let coCreateCss = getCoCreateStyle(element.classList);
          let coCreateCssValue = coCreateCss[dataProperty];
          if(!input.value) return {
            target: elementId,
            method: 'classList.remove',
            value: [dataProperty + ":" + coCreateCssValue]
          };
          

          let style = input.value + input.getAttribute('data-style_unit');
          
          return {
             target: elementId,
             method: 'setCCStyle',
             value: [dataProperty, style]
          }
          
          // return [{
          //   target: elementId,
          //   method: coCreateCssValue ? "classList.replace" :  "classList.add",
          //   value: coCreateCssValue
          //     ? [dataProperty + ":" + coCreateCssValue, dataProperty + ":" + style]
          //     : [dataProperty + ":" + style],
          // }];
  
        };

        break;
      case "attribute":
      
        value = element.getAttribute(dataProperty);
        input.value = value;
        payloadGenerator = (value) => {
          if(!input.value) return;
          return {
            target: elementId,
            method: "setAttribute",
            value: [dataProperty, input.value],
          }
        };
        
     
        break;
      default:
      
    }

    input.setAttribute("data-style_target", `[data-element_id=${elementId}]`);

    if (input.coCreateListner)
      input.removeEventListener("input", input.coCreateListner);

    input.coCreateListner = (e) => {
      // todo: add unit
      let newValue = e.target.value; 
      let payload = payloadGenerator(); 
      if(!payload) return;
      let broadcast = {
        broadcast_sender: true,
        rooms: "",
        emit: {
          message: "inputChange",
          data: payload,
        },
      };
      console.log('aaaaaaaa', payload)
      CoCreate.sendMessage(broadcast);
    };
    input.addEventListener("input", input.coCreateListner);

  });


});



function getCoCreateStyle(classList) {
  let styles = {};
  classList.forEach((classname) => {
    let [name, value] = classname.split(":");
    styles[name] = value;
  });

  return styles;
}



// function putCoCreateStyle(classList, newStyles) {
//   let styleMap = new Map();
//   classList.forEach((classname) => {
//     let [name, value] = classname.split(":");
//     styleMap.set(name, value);
//   });

//   // let sortedStyle;
//   // Object.keys(newStyles)
//   //   .sort()
//   //   .forEach(function (key) {
//   //     sortedStyle[key] = newStyles[key];
//   //   });
//   for (let [name, value] of Object.entries(newStyles)) {
//     if (styleMap.has(name)) {
//       let value = styleMap.get(name);
//       classList.remove(name + ":" + value);
//     }
//     classList.add(name + ":" + value);
//   }
// }



