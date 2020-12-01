/*global MutationObserver*/
/**
 * data-style: classStyle | style | attribute
 * data-style_sync: any valid css property
 * data-style_unit: any valid css unit type
 * data-style_target: unique id of element written to data-element_id
 */

// todo: disable input when there is no data-style, there is no reason it to have default value it should be
// disabled
(function () {
  let filters = [];
  let allFrames = new Map();
  function allFrame(callback) {
    let result = new Set();
    for (let [frameObject, frame] of allFrames) {
      let callbackResult = callback(frame.document, frame.window);
      if (
        callbackResult &&
        typeof callbackResult[Symbol.iterator] === "function"
      )
        callbackResult.forEach((el) => result.add(el));
      else if (callbackResult) result.add(callbackResult);
    }

    return Array.from(result).filter(
      (el) => !filters.some((filter) => el.matches(filter))
    );
  }

  function watchInputChange(mutation) {
    let inputMeta = validateNewInput(mutation.target);
    if (!inputMeta) return;

    if (mutation.attributeName === "data-style_target") {
      let element = getElement(inputMeta.input);
      if (element) updateInput(element, [inputMeta.input]);
    } else if (mutation.attributeName === "value") {
      updateElement(inputMeta);
    }
  }

  // function watchElementChange(mutationsList, observer) {
  //   for (let mutation of mutationsList) {
  //     updateInput(mutation.target);
  //   }
  // }

  // function watchInputChange(mutationsList, observer) {
  //   watchElementChangeObserver.disconnect();
  //   for (let mutation of mutationsList)
  //     if (
  //       // mutation.target.isReactive !== false &&
  //       mutation.type === "attributes" &&
  //       mutation.target.tagName === "INPUT"
  //     ) {
  //       let inputMeta = validateNewInput(mutation.target);
  //       if (!inputMeta) return;

  //       if (mutation.attributeName === "data-style_target") {
  //         let element = getElement(inputMeta.input);
  //         // mutation.target.isReactive = false;

  //         updateInput(element, [inputMeta.input]);
  //       } else {
  //         updateElement(inputMeta);
  //       }
  //     }
  //   watchElementChangeObserver.observe(canvas, configElement);// todo: no canvas
  // }

  // canvas.body.addEventListener("click", (e) => {
  //   updateInput(e.target)
  // });

  function getInputs(element) {
    let inputs = [];
    let allInputs = Array.from(document.getElementsByTagName("input"));
    allInputs.forEach((inputCandidate) => {
      let inputMeta = validateNewInput(inputCandidate);
      if (!inputMeta) return;

      let allReferencedEl = allFrame((frame) =>
        frame.querySelectorAll(
          inputMeta.input.getAttribute("data-style_target")
        )
      );
      if (Array.from(allReferencedEl).includes(element)) {
        inputs.push(inputMeta.input);
      }
    });
    return inputs;
  }

  function getElement(input) {
    let id = input.getAttribute("data-style_target");
    if (id) return allFrame((frame) => frame.querySelector(id))[0];
    else return false;
  }
  // function getRealStaticCompStyleOld(element) {
  //   // calculate real css instead of comupted element
  //   watchElementChangeObserver.disconnect();
  //   let oldDispaly = element.style.display;

  //   element.style.display = "none";

  //   let computedStylesLive = window.getComputedStyle(element);
  //   let computedStyles = Object.assign({}, computedStylesLive);
  //   computedStyles.display = oldDispaly;

  //   element.style.display = oldDispaly;
  //   if (element.getAttribute("style") == "") element.removeAttribute("style");
  //   watchElementChangeObserver.observe(canvas, configElement);
  //   return computedStyles;
  // }
  // function getAllStyles() {
  //   for (let styleSheet of document.styleSheets) {
  //     let style;
  //     try {
  //       style = styleSheet.cssRules || styleSheet.rules;
  //     } catch (error) {
  //       console.log("couldn't parse style");
  //     }
  //     if(!style) continue;
  //       for (let rule of style) {
  //         let selector = rule.selectorText;
  //         querySelectorAll
  //       }
  //     style = undefined;
  //   }
  // }
  // getAllStyles();
  function getRealStaticCompStyle(element) {
    // calculate real css instead of comupted element
    // watchElementChangeObserver.disconnect();
    let oldDispaly = element.style.display;
    // element.setAttribute('no-observe', true)
    element.style.display = "none";

    let computedStylesLive = window.getComputedStyle(element);
    let computedStyles = Object.assign({}, computedStylesLive);
    computedStyles.display = oldDispaly;

    element.style.display = oldDispaly;
    if (element.getAttribute("style") == "") element.removeAttribute("style");
    // element.removeAttribute('no-observe')
    // watchElementChangeObserver.observe(canvas, configElement);
    return computedStyles;
  }
  function validateNewInput(input) {
    let dataAttribute = input.getAttribute("data-style");
    if (!dataAttribute) return;
    // console.warn("cc-style: input doesn't have data-style")
    dataAttribute = dataAttribute.toLowerCase();
    let dataProperty = input.getAttribute("data-style_sync");
    if (!dataProperty) return;
    // console.warn("cc-style: input doesn't have data-style")
    dataProperty = dataProperty.toLowerCase();
    return {
      input,
      dataAttribute,
      dataProperty,
    };
  }

  function parseUnit(style) {
    let value = parseInt(style);
    if (!isNaN(value)) {
      let valueLength = (value + "").length;
      return [value, style.substr(valueLength) || "none"];
    }
    return [style, ""];
  }

  function getCoCreateStyle(classList) {
    let styles = {};
    classList.forEach((classname) => {
      let [name, value] = classname.split(":");
      styles[name] = value;
    });

    return styles;
  }

  function putCoCreateStyle(classList, newStyles) {
    let styleMap = new Map();
    classList.forEach((classname) => {
      let [name, value] = classname.split(":");
      styleMap.set(name, value);
    });

    for (let [name, value] of Object.entries(newStyles)) {
      if (styleMap.has(name)) {
        let value = styleMap.get(name);
        classList.remove(name + ":" + value);
      }
      classList.add(name + ":" + value);
    }
  }
  function removeccCssStyle(classList, property) {
    let coCreateCss = getCoCreateStyle(classList);
    delete coCreateCss[property];
    putCoCreateStyle(classList, coCreateCss);
  }

  function assignElementId(element, isReactive = false) {
    let inputs = Array.from(document.getElementsByTagName("input"));
    inputs.forEach((inputCandidate) => {
      let inputMeta = validateNewInput(inputCandidate);
      if (!inputMeta) return;
      let { input, dataAttribute, dataProperty } = inputMeta;

      input.isReactive = isReactive;
      let elementId = element.getAttribute("data-element_id");
      input.setAttributeIfDiffer(
        "data-style_target",
        `[data-element_id=${elementId}]`
      );
    });
  }
  // mutation reflect data-style_unit
  function setPlaceHolders(element) {
    let inputs = getInputs(element);
    inputs.forEach((inputCandidate) => {
      let inputMeta = validateNewInput(inputCandidate);
      if (!inputMeta) return;
      let { input, dataAttribute, dataProperty } = inputMeta;
      dataProperty = toCamelCase(dataProperty);
      let elementId = element.getAttribute("data-element_id");
      if (!elementId) return;
      let inputElementId = input.getAttribute("data-style_target");
      if (elementId != inputElementId) {
        let computedStyles = getRealStaticCompStyle(element);
        let style;
        switch (dataAttribute) {
          case "style":
            style = computedStyles[dataProperty];
            break;
          case "classstyle":
            let coCreateCss = getCoCreateStyle(element.classList);
            style = coCreateCss[dataProperty];
            if (!style) style = computedStyles[dataProperty];
            break;

          default:
            style = computedStyles[dataProperty];
        }
        // style= true;
        // update style unit
        if (style) {
          let [value, unit] = parseUnit(style);
          input.setAttributeIfDiffer("placeholder", value);
          if (input.value) input.value = value;
          input.setAttributeIfDiffer("name", elementId);
          input.setAttributeIfDiffer("data-style_unit", unit);
        } else input.setAttributeIfDiffer("data-style_unit", "");
      }
    });
  }

  function updateInput(element, inputs) {
    let computedStyles = getRealStaticCompStyle(element);
    // let computedStyles = {};
    if (!inputs) inputs = getInputs(element);

    inputs.forEach((inputCandidate) => {
      let inputMeta = validateNewInput(inputCandidate);
      if (!inputMeta) return;
      let { input, dataAttribute, dataProperty } = inputMeta;
      dataProperty = toCamelCase(dataProperty);
      let elementId = element.getAttribute("data-element_id");
      if (!elementId) return;

      //calculate style
      let style;
      switch (dataAttribute) {
        case "style":
          style = computedStyles[dataProperty];
          break;
        case "classstyle":
          let coCreateCss = getCoCreateStyle(element.classList);
          style = coCreateCss[dataProperty];
          if (!style) style = computedStyles[dataProperty];
          break;

        default:
          style = computedStyles[dataProperty];
      }
      // style= true;
      // update style unit
      if (style) {
        let [value, unit] = parseUnit(style);
        input.setAttributeIfDiffer("placeholder", value);
        if (input.value) input.value = value;
        // input.setAttributeIfDiffer("name", elementId);
        input.setAttributeIfDiffer("data-style_unit", unit);
      } else input.setAttributeIfDiffer("data-style_unit", "");
    });
  }

  function updateElement(inputMeta) {
    let { input, dataAttribute, dataProperty } = inputMeta;

    let elementSelectorId = input.getAttribute("data-style_target");
    let element = allFrame((frame) =>
      frame.querySelector(elementSelectorId)
    )[0];
    if (!element) return;

    let style;

    let [value, unit] = parseUnit(input.value);

    unit = input.getAttribute("data-style_unit");
    switch (dataAttribute) {
      case "classstyle":
        // when input is empty remove that style
        if (!input.value) {
          removeccCssStyle(element.classList, dataProperty);
          return;
        }
        // when there is style set that

        style = value + unit;
        element.setCCStyle(dataProperty, style);

        break;
      case "style":
        dataProperty = toCamelCase(dataProperty);
        // let computedStyles = getRealStaticCompStyle(element);
        // let styleValue = computedStyles[dataProperty];
        if (!input.value) {
          element.setStlyeIfDiffer(dataProperty, "");
          // element.style[dataProperty] = "";
          return;
        }

        style = value + unit;
        element.setStlyeIfDiffer(dataProperty, style);
        // element.style[dataProperty] = style;

        break;
      default:
    }
  }

  function toCamelCase(str) {
    let index = 0;
    do {
      index = str.indexOf("-", index);
      if (index !== -1) {
        let t = str.substring(0, index);
        t += String.fromCharCode(str.charCodeAt(index + 1) - 32);
        t += str.substr(index + 2);
        str = t;
      } else break;
    } while (true);
    return str;
  }

  function setAttributeIfDiffer(property, value) {
    if (this.getAttribute(property) !== value)
      this.setAttribute(property, value);
  }

  function setStlyeIfDiffer(property, value) {
    let computedStyles = getRealStaticCompStyle(this);
    if (computedStyles[property] !== value) this.style[property] = value;
  }

  function addClassIfDiffer(className) {
    if (!this.classList.has(className)) this.classList.add(className);
  }

  function setCCStyle(property, newValue) {
    for (let classname of this.classList) {
      let [name, value] = classname.split(":");
      if (name === property) {
        this.classList.replace(classname, property + ":" + newValue);
        break;
      }
    }
    this.classList.add(property + ":" + newValue);
  }

  function getCCStyle(property) {
    let styleMap = new Map();
    for (let classname of this.classList) {
      let [name, value] = classname.split(":");
      if (name === property) {
        return value;
      }
    }
  }

  function init({ windowObject, docObject, isIframe, frame }) {
    let ref;

    if (isIframe) {
      let frameWindow = frame.contentWindow;
      let frameDocument = frameWindow.document || frame.contentDocument;

      ref = {
        frame,
        window: frameWindow,
        document: frameDocument,
        isIframe: true,
      };
      allFrames.set(frame,ref);
    } else {
      ref = { window: windowObject, document: docObject, isIframe: false };
      allFrames.set('main',ref);
    }

    ref.window.HTMLElement.prototype.setAttributeIfDiffer = setAttributeIfDiffer;
    ref.window.HTMLElement.prototype.setStlyeIfDiffer = setStlyeIfDiffer;
    ref.window.HTMLElement.prototype.addClassIfDiffer = addClassIfDiffer;
    ref.window.HTMLElement.prototype.setCCStyle = setCCStyle;
    ref.window.HTMLElement.prototype.getCCStyle = getCCStyle;

    ref.window.addEventListener('load',()=>{
      ref.window.CoCreateObserver.add({
        name: "ccStyle",
        observe: ["attributes"],
        attributes: ["data-style_target", "value"],
        include: "INPUT",
        task: watchInputChange,
        });
    })

    ref.document.addEventListener("input", (e) => {
      let input = e.target;
      // input.isReactive = true;
      let inputMeta = validateNewInput(input);
      if (!inputMeta) return;

      updateElement(inputMeta);
    });
  }

  function addFilter(selector) {
    filters.push(selector);
  }
  window.ccStyle = { init, addFilter };

  window.addEventListener("load", () => {

      window.CoCreateObserver.add({
        name: "ccStyle",
        observe: ["attributes"],
        attributes: ["data-style_target", "value"],
        include: "INPUT",
        task: watchInputChange,
        });

    init({ windowObject: window, docObject: document });
  });
})();
