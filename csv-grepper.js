const app = Vue.createApp({
  data() {
    return {
      headers: [],
      rows: [],
      searchText: "",
      isContainerFluid: false,
      // Add this data property for datasets
      datasets: [
        {
          name: "None",
          headers: [],
          rows: [],
        },
      ],
      selectedDatasetIndex: 0, // default selected dataset
    };
  },
  computed: {
    filteredRows() {
      const searchWordsAll = this.searchText.toLowerCase().split(/\s+/);
      const searchWords = searchWordsAll.filter((word) => word.length > 0);

      const escapedRows = this.rows.map((row) =>
        row.map((cell) => this.escapeHtml(cell))
      );

      if (!this.searchText) {
        return escapedRows;
      }

      return escapedRows
        .filter((row) =>
          searchWords.every((word) =>
            row.some((cell) => cell.toLowerCase().includes(word))
          )
        )
        .map((row) => row.map((cell) => this.highlighted(cell, searchWords)));
    },
    selectedDataset() {
      return this.datasets[this.selectedDatasetIndex];
    },
  },
  methods: {
    async loadCSV(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        this.processCSV(content, file.name);
      };
      reader.readAsBinaryString(file);
    },
    processCSV(content, datasetName) {
      const encodingType = Encoding.detect(content);
      const content_utf = Encoding.convert(content, {
        from: encodingType,
        to: "UNICODE",
        type: "string",
      });

      const rows = this.parseCSVRows(content_utf);

      this.headers = rows.shift();
      this.rows = rows;

      // Save the dataset to LocalStorage
      if (!datasetName) {
        const inputDatasetName = prompt(
          "Enter a name for the dataset",
          "Dataset"
        );
        datasetName = inputDatasetName;
      }
      if (datasetName) {
        this.datasets.push({
          name: datasetName,
          headers: this.headers,
          rows: this.rows,
        });
        localStorage.setItem("datasets", JSON.stringify(this.datasets));
        this.selectDataset(1);
      }
    },
    parseCSVRows(text) {
      const lines = text.trim().split(/\r?\n/);
      const rows = [];

      let currentRow = [];
      let currentValue = "";
      let inQuotes = false;

      for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
          const currentChar = line[i];

          if (inQuotes) {
            if (currentChar === '"') {
              if (line[i + 1] === '"') {
                currentValue += '"';
                i++;
              } else {
                inQuotes = false;
              }
            } else {
              currentValue += currentChar;
            }
          } else {
            if (currentChar === '"') {
              inQuotes = true;
            } else if (currentChar === ",") {
              currentRow.push(currentValue);
              currentValue = "";
            } else {
              currentValue += currentChar;
            }
          }
        }

        if (inQuotes) {
          currentValue += "\n";
        } else {
          currentRow.push(currentValue);
          rows.push(currentRow);
          currentRow = [];
          currentValue = "";
        }
      }

      return rows;
    },
    clearLocalStorage() {
      localStorage.removeItem("datasets");
      this.datasets = [
        {
          name: "Default",
          headers: [],
          rows: [],
        },
      ];
      this.selectedDatasetIndex = 0;
    },
    async loadInitialData() {
      // Load data from LocalStorage
      const datasets = localStorage.getItem("datasets");

      if (datasets) {
        this.datasets = JSON.parse(datasets);
        return;
      }

      // Fetch initial data if not in LocalStorage
      try {
        const response = await fetch("initialdb.csv");
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const content = await response.text();
        this.processCSV(content, "Sample Data");
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    },
    selectDataset(index) {
      this.selectedDatasetIndex = index;
      this.headers = this.selectedDataset.headers;
      this.rows = this.selectedDataset.rows;
    },
    handleDragEnter(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    handleDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    handleDragLeave(event) {
      event.preventDefault();
    },
    handleDrop(event) {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file) {
        return;
      }
      this.loadCSV({ target: { files: [file] } });
    },
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },
    highlighted(cell, searchWords) {
      const escapedSearchWords = searchWords.map((word) =>
        this.escapeHtml(word)
      );

      const newCell = escapedSearchWords.reduce((acc, word) => {
        const regex = new RegExp(`(${word})(?![^<]*>|[^<>]*<\\/)`, "gi");
        return acc.replace(
          regex,
          (match) => `<span class='highlighted'>${match}</span>`
        );
      }, cell);

      return newCell;
    },
    toggleOverflow(event) {
      const target = event.target;
      if (target.style.whiteSpace === "nowrap") {
        target.style.whiteSpace = "normal";
      } else {
        target.style.whiteSpace = "nowrap";
      }
    },
    deleteDataset(index) {
      if (confirm("Are you sure you want to delete this dataset?")) {
        this.datasets.splice(index, 1);
        localStorage.setItem("datasets", JSON.stringify(this.datasets));

        if (this.selectedDatasetIndex === index) {
          this.selectedDatasetIndex = 0;
          this.headers = this.selectedDataset.headers;
          this.rows = this.selectedDataset.rows;
        }
      }
    },
    toggleContainerFluid() {
      this.isContainerFluid = !this.isContainerFluid;
    },
  },
  created() {
    this.loadInitialData();
  },
});
app.mount("#app");
