# Component-Based HTML Structure

This project uses a component-based approach for the HTML files to avoid duplication and make maintenance easier.

## Structure

### Components

Common components are stored in the `components/` directory:

#### Shared Components
- `head.html` - Common head elements and CSS links
- `api-key-modal.html` - API key modal dialog for OpenAI API key entry
- `footer.html` - Common footer with copyright information

#### Page-Specific Components
- `home-content.html` - Main content for the home page with search and examples
- `results-content.html` - Content for the results page showing artist recommendations
- `search-bar.html` - Search bar components for both home and results pages

### CSS System

The project uses a systematic approach for styling with:

- Typography scale with 4 sizes
  - `--font-size-xs`: 0.875rem (14px) - Small text, notes, footer
  - `--font-size-s`: 1rem (16px) - Body text, buttons, inputs
  - `--font-size-m`: 1.25rem (20px) - Subtitles, section headings
  - `--font-size-l`: 2rem (32px) - Main headings

- Spacing scale with 4 values
  - `--space-xs`: 0.5rem (8px) - Compact spacing, buttons, form controls
  - `--space-s`: 1rem (16px) - Standard spacing, paragraphs
  - `--space-m`: 1.5rem (24px) - Section spacing, margins
  - `--space-l`: 2.5rem (40px) - Major section spacing, page gaps

### Build Process

The `build.js` script combines these components with page-specific content to generate the final HTML files:

- `index.html` - Home page
- `results.html` - Artist results page

## Building the HTML Files

To rebuild the HTML files after making changes to any component:

```bash
node build.js
```

This will generate or update both HTML files with the latest components.

## Modifying Components

1. Edit the files in the `components/` directory to make changes to shared elements
2. Run the build script to regenerate the HTML files
3. Test the changes to make sure they work as expected

## Adding New Components

1. Create a new HTML file in the `components/` directory
2. Update the `build.js` script to include the new component
3. Run the build script to generate the updated HTML files

## Component Usage

### Adding the Full Search Bar

To add the search bar to the home page, you need to include it in the build script:

```javascript
// In build.js
const searchBar = readFile(path.join(__dirname, 'components', 'search-bar.html'));
// Then in the template:
// Replace <!-- HOME_SEARCH_BAR --> with the searchBar content
```

### Adding the Mini Search Bar

For results page, use the mini search bar from the search-bar.html component:

```javascript
// Extract the mini search bar section from search-bar.html
// Then include it in the header portion of results page
```

## Benefits

- Reduces code duplication across pages
- Makes it easier to maintain consistent styles and behavior
- Centralizes common elements like headers, footers, and modals
- Provides a systematic typography and spacing scale
- Makes UI updates more efficient by changing components in one place
- Improves development workflow with a simple build process
- Keeps the codebase more organized and maintainable