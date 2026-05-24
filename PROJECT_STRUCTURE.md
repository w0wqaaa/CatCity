# Cat City Project Structure

## Runtime

- `index.html` loads the game.
- `style.css` contains UI and canvas styles.
- `src/core/` contains the main game loop and asset loading.
- `src/core/dataLoader.js` loads locations, characters, quests, and dialogs from `data/`.
- `src/entities/` contains character and NPC classes.
- `src/maps/` contains map-specific runtime files such as collision maps.
- `src/config/` contains shared constants and asset paths.

## Content

- `assets/maps/<location>/` stores map images and tiles for each location.
- `assets/characters/<character>/` stores character sprites and animation frames.
- `data/locations/` stores location metadata.
- `data/characters/` stores character metadata.
- `data/quests/` stores quest definitions.
- `data/dialogs/` stores dialog scripts.

The browser now reads these JSON files at runtime, so new content can be added by creating matching records in `data/` and placing assets under `assets/`.

## Tools

- `tools/` contains scripts used to generate or maintain content. Tools are not loaded by the browser at runtime.
