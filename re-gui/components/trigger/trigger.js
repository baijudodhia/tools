class AppTrigger extends HTMLElement {
  constructor(
    props = {
      id: "trigger",
      loading: false,
    },
    basePath = "./components/trigger",
    templateUrl = "./components/trigger/trigger.html",
    templateStyleUrls = [
      "./index.css",
      "./components/trigger/trigger.css",
      "https://baijudodhia.github.io/cdn/font-awesome-5.15.4/icons/all.min.css",
    ],
  ) {
    super();

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

    const element = this.shadowRoot.querySelector("#trigger");
    if (element) {
      element.remove();
    }

    let trigger = document.createElement("div");
    trigger.classList.add("trigger");
    trigger.setAttribute("id", "trigger");
    trigger.innerHTML = "";

    this.shadowRoot.appendChild(trigger);

    return trigger;
  }

  getTemplate() {
    return this.shadowRoot.querySelector("#trigger-template");
  }

  getTemplateClone(template) {
    return template.content.cloneNode(true);
  }

  render() {
    this.props = getComponentProps.call(this, this.props);
    const trigger = this.getElement();

    if (trigger && "content" in document.createElement("template")) {
      const itemTemplate = this.getTemplateClone(this.getTemplate());

      // Apply data-attributes directly to the div container element
      Object.keys(this.props).forEach((key) => {
        let value = this.props[key];

        if (!isEmptyValue(value)) {
          if (key === "id") {
            trigger.setAttribute(`${key}`, value);
          } else {
            trigger.setAttribute(`data-${key}`, value);
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

        trigger.innerHTML = ""; // Clear existing content
        trigger.appendChild(loadingAnimationContainer.cloneNode(true));
      } else {
        // Render children

        trigger.innerHTML = ""; // Clear existing content
        trigger.appendChild(itemTemplate);
      }

      // Add Event Listeners
      const triggerKeySelect = trigger.querySelector("#trigger-key");
      triggerKeySelect.innerHTML = "";
      triggerKeySelect.appendChild(
        this.getTemplateClone(this.shadowRoot.querySelector("#trigger-options-template")),
      );
      triggerKeySelect.addEventListener("change", this.handleOnChangeTrigger.bind(this));

      this.handleOnChangeTrigger(); // Initialize trigger properties based on the default selection

      trigger.querySelector("#trigger-save-btn").addEventListener("click", (e) => {
        const triggerConfig = this.generateJSON();

        this.shadowRoot.querySelector("#trigger-form").reset();

        const event = new CustomEvent("onSave", { detail: triggerConfig });

        this.dispatchEvent(event);
      });
    }
  }

  handleOnChangeTrigger() {
    const key = this.shadowRoot.querySelector("#trigger-key").value;
    const triggerProps = this.shadowRoot.querySelector("#trigger-key-form");
    triggerProps.innerHTML = "";

    switch (key) {
      default:
        triggerProps.innerHTML = "";
        break;
    }
  }

  generateJSON() {
    const key = this.shadowRoot.querySelector("#trigger-key").value;

    switch (key) {
      default:
        break;
    }

    const trigger = key;

    return trigger;
  }
}

customElements.define("app-trigger", AppTrigger);
