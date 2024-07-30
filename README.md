# llm-benchmark-cli

Node.js CLI tool implementation of https://github.com/MinhNgyuen/llm-benchmark for benchmarking language models by running specified prompts and calculating various inference statistics.

## Features

- Fetches available models from a local API
- Runs benchmarks on specified models using given prompts
- Calculates and displays inference statistics
- Supports configuration via command line options or a config file
- Saves benchmark results to a specified file

## Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/danmoreng/llm-benchmark-cli.git
   cd llm-benchmark-cli
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

## Usage

Run the CLI with default settings:

```sh
node index.js
```

### Command Line Options

- `-v, --verbose`: Increase output verbosity
- `-s, --skip-models <models...>`: List of model names to skip
- `-p, --prompts <prompts...>`: List of prompts to use for benchmarking (default: ['Why is the sky blue?'])
- `-c, --config <path>`: Path to an optional configuration file
- `-o, --output <path>`: Path to save benchmark results (default: 'benchmark_results.json')

### Examples

1. **Run with increased verbosity:**

   ```sh
   node index.js --verbose
   ```

2. **Skip specific models:**

   ```sh
   node index.js --skip-models model1 model2
   ```

3. **Use custom prompts:**

   ```sh
   node index.js --prompts "What is AI?" "How does it work?"
   ```

4. **Specify a configuration file:**

   ```sh
   node index.js --config path/to/config.json
   ```

5. **Save results to a custom file:**

   ```sh
   node index.js --output results.json
   ```

## Configuration File

You can also configure the CLI using a JSON file. The options specified in the config file will be merged with the command line options.

**Example `config.json`:**

```json
{
  "skipModels": ["model1", "model2"],
  "prompts": ["What is AI?", "How does it work?"]
}
```

## Output

The benchmark results are saved to the specified output file in JSON format. The results include inference statistics such as:

- Prompt tokens per second
- Response tokens per second
- Total tokens per second
- Total duration of the benchmark

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.