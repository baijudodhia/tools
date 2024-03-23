class AppSource extends HTMLElement {
  constructor(
    props = {
      id: "source",
      loading: false,
    },
    basePath = "./components/source",
    templateUrl = "./components/source/source.html",
    templateStyleUrls = [
      "./index.css",
      "./components/source/source.css",
      "https://baijudodhia.github.io/cdn/font-awesome-5.15.4/icons/all.min.css",
    ],
  ) {
    super();

    this._cachedResult = false;

    this.props = props;
    this.basePath = basePath;
    this.templateUrl = templateUrl;
    this.templateStyleUrls = templateStyleUrls;

    setComponentTemplate.call(
      this,
      () => {
        this.render();
      },
      () => {
        console.log("Initial setup failed!");
      },
    );
  }

  /**
   * 1. Browser calls this method when the element is added to the document.
   * 2. Can be called many times if an element is repeatedly added/removed.
   */
  connectedCallback() {}

  /**
   * 1. Browser calls this method when the element is removed from the document.
   * 2. Can be called many times if an element is repeatedly added/removed.
   */
  disconnectedCallback() {}

  static get observedAttributes() {
    return ["id", "loading"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && newValue) {
      this.props[name] = newValue;
      this.render();
    }
  }

  adoptedCallback() {
    // called when the element is moved to a new document
    // (happens in document.adoptNode, very rarely used)
  }

  getElement() {
    if (!this.shadowRoot) {
      return null;
    }

    const element = this.shadowRoot.querySelector("#source");
    if (element) {
      element.remove();
    }

    let source = document.createElement("div");
    source.classList.add("source");
    source.setAttribute("id", "source");
    source.innerHTML = "";

    this.shadowRoot.appendChild(source);

    return source;
  }

  getTemplate() {
    return this.shadowRoot.querySelector("#source-template");
  }

  getTemplateClone(template) {
    return template.content.cloneNode(true);
  }

  render() {
    this.props = getComponentProps.call(this, this.props);
    const source = this.getElement();

    if (!this._cachedResult && source && "content" in document.createElement("template")) {
      const itemTemplate = this.getTemplateClone(this.getTemplate());

      // Apply data-attributes directly to the div container element
      Object.keys(this.props).forEach((key) => {
        let value = this.props[key];

        if (!isEmptyValue(value)) {
          if (key === "id") {
            source.setAttribute(`${key}`, value);
          } else {
            source.setAttribute(`data-${key}`, value);
          }
        }
      });

      if (this.props.loading === "true") {
        // Render loading animations
        const loadingAnimationContainer = document.createElement("div");
        loadingAnimationContainer.setAttribute("id", "loader-container");

        const loadingAnimation = document.createElement("div");
        loadingAnimation.setAttribute("id", "loader");
        loadingAnimation.setAttribute("data-appearance", this.props.appearance);
        loadingAnimation.setAttribute("data-size", this.props.size);
        loadingAnimation.setAttribute("disabled", true);

        loadingAnimationContainer.appendChild(loadingAnimation.cloneNode(true));

        source.innerHTML = ""; // Clear existing content
        source.appendChild(loadingAnimationContainer.cloneNode(true));
        this._cachedResult = true;
      } else {
        // Render children

        source.innerHTML = ""; // Clear existing content
        source.appendChild(itemTemplate);
        this._cachedResult = true;
      }

      // Add Event Listeners
      const sourceKeySelect = source.querySelector("#source-key");
      sourceKeySelect.innerHTML = "";
      sourceKeySelect.appendChild(
        this.getTemplateClone(this.shadowRoot.querySelector("#source-options-template")),
      );
      sourceKeySelect.addEventListener("change", this.handleOnChangeSource.bind(this));

      this.handleOnChangeSource(); // Initialize source properties based on the default selection

      source.querySelector("#source-close-btn").addEventListener("click", (e) => {
        e.preventDefault();

        const event = new CustomEvent("onClose", e);

        this.dispatchEvent(event);

        this.shadowRoot.querySelector("#source-form").reset();

        this.handleOnChangeSource();

        this._cachedResult = null;
      });

      source.querySelector("#source-save-btn").addEventListener("click", (e) => {
        const sourceConfig = this.generateJSON();

        const event = new CustomEvent("onSave", { detail: sourceConfig });

        this.dispatchEvent(event);

        this.shadowRoot.querySelector("#source-form").reset();

        this.handleOnChangeSource();

        this._cachedResult = null;
      });
    }
  }

  handleOnChangeSource() {
    const key = this.shadowRoot.querySelector("#source-key").value;
    const sourceProps = this.shadowRoot.querySelector("#source-key-form");
    sourceProps.innerHTML = "";

    switch (key) {
      case "OBJECT":
        const sourceKey_Object = this.getTemplateClone(
          this.shadowRoot.querySelector("#source-object-template"),
        );
        sourceProps.appendChild(sourceKey_Object);
        break;
      case "BROWSER_STORAGE":
        const sourceKey_BrowserStorage = this.getTemplateClone(
          this.shadowRoot.querySelector("#source-browser_storage-template"),
        );
        sourceProps.appendChild(sourceKey_BrowserStorage);
        break;
      case "PATTERN":
        const sourceKey_Pattern = this.getTemplateClone(
          this.shadowRoot.querySelector("#source-pattern-template"),
        );
        sourceProps.appendChild(sourceKey_Pattern);
        this.handleOnChangeSourcePatternKey(); // Call the function to set up the event listener
        break;
      case "PREDEFINED":
        const sourceKey_Predefined = this.getTemplateClone(
          this.shadowRoot.querySelector("#source-predefined-template"),
        );
        sourceProps.appendChild(sourceKey_Predefined);
        break;
      case "REMOTE":
        const sourceKey_Remote = this.getTemplateClone(
          this.shadowRoot.querySelector("#source-remote-template"),
        );
        sourceProps.appendChild(sourceKey_Remote);
        break;
      case "QUERY_PARAMS":
        const sourceKey_QueryParams = this.getTemplateClone(
          this.shadowRoot.querySelector("#source-query_params-template"),
        );
        sourceProps.appendChild(sourceKey_QueryParams);
        break;
      default:
        sourceProps.innerHTML = "";
        break;
    }
  }

  handleOnChangeSourcePatternKey() {
    const patternKeySelect = this.shadowRoot.querySelector("#patternKey");

    this.handlePatternKeyChange();

    patternKeySelect.addEventListener("change", this.handlePatternKeyChange.bind(this));
  }

  handlePatternKeyChange() {
    const patternKey = this.shadowRoot.querySelector("#patternKey").value;
    const customPattern = this.shadowRoot.querySelector("#customPattern");

    if (patternKey === "CUSTOM") {
      customPattern.style.display = "flex";
    } else {
      customPattern.style.display = "none";
    }
  }

  generateJSON() {
    const key = this.shadowRoot.querySelector("#source-key").value;
    let props = {};

    switch (key) {
      case "OBJECT":
        props = {
          key: this.shadowRoot.querySelector("#objectKey").value,
          path: this.shadowRoot.querySelector("#objectPath").value,
        };
        break;
      case "BROWSER_STORAGE":
        props = {
          type: this.shadowRoot.querySelector("#storageType").value,
          key: this.shadowRoot.querySelector("#storageKey").value,
        };
        break;
      case "PATTERN":
        const patternKey = this.shadowRoot.querySelector("#patternKey").value;
        if (patternKey === "CUSTOM") {
          props = {
            key: patternKey,
            pattern: this.shadowRoot.querySelector("#pattern").value,
          };
        } else {
          props = {
            key: patternKey,
          };
        }
        break;
      case "PREDEFINED":
        props = {
          predefinedValue: this.shadowRoot.querySelector("#predefinedValue").value,
        };
        break;
      case "REMOTE":
        props = {
          url: this.shadowRoot.querySelector("#remoteURL").value,
        };
        break;
      case "QUERY_PARAMS":
        props = {
          key: this.shadowRoot.querySelector("#queryParamsKey").value,
        };
        break;
      default:
        break;
    }

    const source = {
      key: key,
      props: props,
    };

    const jsonOutput = JSON.stringify(source, null, 2);

    return jsonOutput;
  }
}

customElements.define("app-source", AppSource);
