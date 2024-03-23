class AppRule extends HTMLElement {
  constructor(
    props = {
      id: "rule",
      loading: false,
    },
    basePath = "./components/rule",
    templateUrl = "./components/rule/rule.html",
    templateStyleUrls = [
      "./index.css",
      "./components/rule/rule.css",
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

    const element = this.shadowRoot.querySelector("#rule");
    if (element) {
      element.remove();
    }

    let rule = document.createElement("div");
    rule.classList.add("rule");
    rule.setAttribute("id", "rule");
    rule.innerHTML = "";

    this.shadowRoot.appendChild(rule);

    return rule;
  }

  getTemplate() {
    return this.shadowRoot.querySelector("#rule-template");
  }

  getTemplateClone(template) {
    return template.content.cloneNode(true);
  }

  render() {
    this.props = getComponentProps.call(this, this.props);
    const rule = this.getElement();

    if (rule && "content" in document.createElement("template")) {
      const itemTemplate = this.getTemplateClone(this.getTemplate());

      // Apply data-attributes directly to the div container element
      Object.keys(this.props).forEach((key) => {
        let value = this.props[key];

        if (!isEmptyValue(value)) {
          if (key === "id") {
            rule.setAttribute(`${key}`, value);
          } else {
            rule.setAttribute(`data-${key}`, value);
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

        rule.innerHTML = ""; // Clear existing content
        rule.appendChild(loadingAnimationContainer.cloneNode(true));
      } else {
        // Render children

        rule.innerHTML = ""; // Clear existing content
        rule.appendChild(itemTemplate);
      }

      // Add Event Listeners
      const ruleKeySelect = rule.querySelector("#rule-key");
      ruleKeySelect.innerHTML = "";
      ruleKeySelect.appendChild(
        this.getTemplateClone(this.shadowRoot.querySelector("#rule-options-template")),
      );
      ruleKeySelect.addEventListener("change", this.handleOnChangeRule.bind(this));

      this.handleOnChangeRule(); // Initialize rule properties based on the default selection

      rule.querySelector("#rule-save-btn").addEventListener("click", (e) => {
        const ruleConfig = this.generateJSON();

        this.shadowRoot.querySelector("#rule-form").reset();

        const event = new CustomEvent("onSave", { detail: ruleConfig });

        this.dispatchEvent(event);
      });
    }
  }

  handleOnChangeRule() {
    const key = this.shadowRoot.querySelector("#rule-key").value;
    const ruleProps = this.shadowRoot.querySelector("#rule-key-form");
    ruleProps.innerHTML = "";

    switch (key) {
      case "VALUE_CHECK":
        const ruleKey_ValueCheck = this.getTemplateClone(
          this.shadowRoot.querySelector("#rule-value_check-template"),
        );
        ruleProps.appendChild(ruleKey_ValueCheck);

        const showValueSource = ruleProps.querySelector("#showValueSource");
        showValueSource.addEventListener("click", () => {
          ruleProps.querySelector("#sg2-vc-vs").style.display = "block";
        });

        ruleProps.querySelector("#sg2-vc-vs").addEventListener("onSave", (event) => {
          const jsonOutput = event.detail;

          ruleProps.querySelector("#valueSource").value = jsonOutput;

          ruleProps.querySelector("#sg2-vc-vs").style.display = "none";
        });

        break;
      case "OBJECT_PATH_EXISTS":
        const ruleKey_ObjectPathExists = this.getTemplateClone(
          this.shadowRoot.querySelector("#rule-object_path_exists-template"),
        );
        ruleProps.appendChild(ruleKey_ObjectPathExists);
        break;
      case "VALUE_COMPARE":
        const ruleKey_ValueCompare = this.getTemplateClone(
          this.shadowRoot.querySelector("#rule-value_compare-template"),
        );
        ruleProps.appendChild(ruleKey_ValueCompare);

        const showLeftSource = ruleProps.querySelector("#showLeftSource");
        showLeftSource.addEventListener("click", () => {
          ruleProps.querySelector("#sg2-vc-ls").style.display = "block";
        });

        // Inside the connectedCallback or wherever you want to set up event listeners
        ruleProps.querySelector("#sg2-vc-ls").addEventListener("onSave", (event) => {
          const jsonOutput = event.detail;
          // Use the jsonOutput as needed in your rule.js component

          ruleProps.querySelector("#leftSource").value = jsonOutput;

          ruleProps.querySelector("#sg2-vc-ls").style.display = "none";
        });

        const showRightSource = ruleProps.querySelector("#showRightSource");
        showRightSource.addEventListener("click", () => {
          ruleProps.querySelector("#sg2-vc-rs").style.display = "block";
        });

        // Inside the connectedCallback or wherever you want to set up event listeners
        ruleProps.querySelector("#sg2-vc-rs").addEventListener("onSave", (event) => {
          const jsonOutput = event.detail;
          // Use the jsonOutput as needed in your rule.js component

          ruleProps.querySelector("#rightSource").value = jsonOutput;

          ruleProps.querySelector("#sg2-vc-rs").style.display = "none";
        });
        break;
      default:
        ruleProps.innerHTML = "";
        break;
    }
  }

  generateJSON() {
    const id = this.shadowRoot.querySelector("#rule-id").value;
    const key = this.shadowRoot.querySelector("#rule-key").value;
    let props = {};

    switch (key) {
      case "VALUE_CHECK":
        props = {
          value: {
            source: JSON.parse(this.shadowRoot.querySelector("#valueSource").value),
          },
          pattern: JSON.parse(this.shadowRoot.querySelector("#patternKey").value),
        };
        break;
      case "OBJECT_PATH_EXISTS":
        props = {
          object: {
            key: this.shadowRoot.querySelector("#objectKey").value,
            path: this.shadowRoot.querySelector("#objectPath").value,
          },
        };
        break;
      case "VALUE_COMPARE":
        props = {
          value: {
            left: {
              source: JSON.parse(this.shadowRoot.querySelector("#leftSource").value),
            },
            right: {
              source: JSON.parse(this.shadowRoot.querySelector("#rightSource").value),
            },
          },
        };
        break;
      default:
        break;
    }

    const rule = {
      id: id,
      key: key,
      props: props,
    };

    const jsonOutput = JSON.stringify(rule, null, 2);

    return jsonOutput;
  }
}

customElements.define("app-rule", AppRule);
