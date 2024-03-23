class AppAction extends HTMLElement {
  constructor(
    props = {
      id: "action",
      loading: false,
    },
    basePath = "./components/action",
    templateUrl = "./components/action/action.html",
    templateStyleUrls = [
      "./index.css",
      "./components/action/action.css",
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

    const element = this.shadowRoot.querySelector("#action");
    if (element) {
      element.remove();
    }

    let action = document.createElement("div");
    action.classList.add("action");
    action.setAttribute("id", "action");
    action.innerHTML = "";

    this.shadowRoot.appendChild(action);

    return action;
  }

  getTemplate() {
    return this.shadowRoot.querySelector("#action-template");
  }

  getTemplateClone(template) {
    return template.content.cloneNode(true);
  }

  render() {
    this.props = getComponentProps.call(this, this.props);
    const action = this.getElement();

    if (action && "content" in document.createElement("template")) {
      const itemTemplate = this.getTemplateClone(this.getTemplate());

      // Apply data-attributes directly to the div container element
      Object.keys(this.props).forEach((key) => {
        let value = this.props[key];

        if (!isEmptyValue(value)) {
          if (key === "id") {
            action.setAttribute(`${key}`, value);
          } else {
            action.setAttribute(`data-${key}`, value);
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

        action.innerHTML = ""; // Clear existing content
        action.appendChild(loadingAnimationContainer.cloneNode(true));
      } else {
        // Render children

        action.innerHTML = ""; // Clear existing content
        action.appendChild(itemTemplate);
      }

      // Add Event Listeners
      const actionKeySelect = action.querySelector("#action-key");
      actionKeySelect.innerHTML = "";
      actionKeySelect.appendChild(
        this.getTemplateClone(this.shadowRoot.querySelector("#action-options-template")),
      );
      actionKeySelect.addEventListener("change", this.handleOnChangeAction.bind(this));

      this.handleOnChangeAction(); // Initialize action properties based on the default selection

      action.querySelector("#action-save-btn").addEventListener("click", (e) => {
        const actionConfig = this.generateJSON();

        this.shadowRoot.querySelector("#action-form").reset();

        this.handleOnChangeAction();

        const event = new CustomEvent("onSave", { detail: actionConfig });

        this.dispatchEvent(event);
      });
    }
  }

  handleOnChangeAction() {
    const key = this.shadowRoot.querySelector("#action-key").value;
    const actionProps = this.shadowRoot.querySelector("#action-key-form");
    actionProps.innerHTML = "";

    switch (key) {
      case "FIELD_HIDE":
      case "FIELD_SHOW":
      case "FIELD_ENABLE":
      case "FIELD_DISABLE":
        const actionKey_General = this.getTemplateClone(
          this.shadowRoot.querySelector("#action-general-template"),
        );
        actionProps.appendChild(actionKey_General);
        break;
      case "FIELD_ERROR_SHOW":
      case "FIELD_ERROR_HIDE":
        const actionKey_ObjectPathExists = this.getTemplateClone(
          this.shadowRoot.querySelector("#action-field_error-template"),
        );
        actionProps.appendChild(actionKey_ObjectPathExists);

        const actionSource = actionProps.querySelector("#showMessageSource");
        actionSource.addEventListener("click", () => {
          actionProps.querySelector("#sg-a-fr-ms").style.display = "block";
        });

        actionProps.querySelector("#sg-a-fr-ms").addEventListener("onSave", (event) => {
          actionProps.querySelector("#fieldErrorMessage").value = event.detail;
          actionProps.querySelector("#sg-a-fr-ms").style.display = "none";
        });
        break;
      default:
        actionProps.innerHTML = "";
        break;
    }
  }

  generateJSON() {
    const id = this.shadowRoot.querySelector("#action-id").value;
    const key = this.shadowRoot.querySelector("#action-key").value;
    const condition = this.shadowRoot.querySelector("#action-condition").value;

    let props = {};

    switch (key) {
      case "FIELD_HIDE":
      case "FIELD_SHOW":
      case "FIELD_ENABLE":
      case "FIELD_DISABLE":
        props = {
          fieldKey: this.shadowRoot.querySelector("#fieldKey").value,
        };
        break;
      case "FIELD_ERROR_SHOW":
      case "FIELD_ERROR_HIDE":
        props = {
          fieldKey: this.shadowRoot.querySelector("#fieldKey").value,
          message: {
            source: JSON.parse(this.shadowRoot.querySelector("#fieldErrorMessage").value),
          },
        };
        break;
      default:
        break;
    }

    const action = {
      id: id,
      key: key,
      condition: condition,
      props: props,
    };

    const jsonOutput = JSON.stringify(action, null, 2);

    return jsonOutput;
  }
}

customElements.define("app-action", AppAction);
