// The fixed portion of the Scene Image Generation Agent Master Template
// (everything except the user-supplied scene prompts that go into the
// INPUT FORMAT section). Kept verbatim from the source template.

export const SCENE_TEMPLATE_HEADER = `SCENE IMAGE GENERATION AGENT MASTER TEMPLATE
For Google Flow Agent Mode
Reusable for Any Documentary Topic

====================================================================
PURPOSE
====================================================================

This master template converts scene-image prompts into batch-wise
Google Flow Agent Mode instructions.

It is designed for documentaries such as:

- History
- Archaeology
- Ancient technology
- Astronomy
- Space mysteries
- Engineering
- Wars
- Scientific mysteries
- Nature documentaries

The user only needs to paste scene prompts that contain:

1. Scene ID
2. Existing Environment Reference Image name
3. Scene Image Generation Prompt

The agent must use the already-created environment image as the
reference/ingredient for generating each scene image.

====================================================================
CRITICAL RULE: EXISTING ENVIRONMENT IMAGES
====================================================================

Environment images have ALREADY been generated in Google Flow.

They are existing assets.

DO NOT:

- Generate new environment images.
- Recreate environments.
- Replace an environment with a similar-looking one.
- Rename environment assets.
- Use the environment name as the final scene image name.

For every scene:

1. Read the ENVIRONMENT REFERENCE IMAGE name.
2. Locate the already-created image asset with exactly that name.
3. Use that existing image as the IMAGE REFERENCE / IMAGE INGREDIENT.
4. Preserve the environment's:
   - architecture
   - geography
   - spatial layout
   - materials
   - lighting character
   - atmosphere
   - visual identity
5. Apply only the scene-specific visual changes described in the scene prompt.
6. Generate the new scene image.
7. Save the generated scene image with the exact Scene ID.

Workflow:

EXISTING ENVIRONMENT IMAGE
        ↓
USE AS IMAGE REFERENCE / IMAGE INGREDIENT
        ↓
APPLY SCENE-SPECIFIC PROMPT
        ↓
GENERATE NEW SCENE IMAGE
        ↓
SAVE EXACTLY AS S#

====================================================================
SCENE ASSET NAMING RULE
====================================================================

The generated scene image MUST be named exactly as the Scene ID.

Examples:

S1
S2
S3
S10
S25
S50

Never use:

Scene 1
S01
S1_Image
S1_TopicName
Random generated names
Descriptive filenames

The final asset name must match the Scene ID exactly.

====================================================================
BATCH PROCESSING RULE
====================================================================

Process scenes in batches of 10.

Iteration 1:
S1–S10

Iteration 2:
S11–S20

Iteration 3:
S21–S30

Iteration 4:
S31–S40

Iteration 5:
S41–S50

Continue the same pattern if more scenes exist.

Each iteration should contain only the scenes belonging to that batch.

Do not skip scenes.
Do not reorder scenes.

====================================================================
IMAGE GENERATION QUALITY RULES
====================================================================

Unless the scene prompt explicitly says otherwise, maintain:

- Photorealistic
- Cinematic documentary style
- Premium IMAX documentary aesthetic
- ARRI Alexa 65 visual quality
- 35mm anamorphic lens characteristics
- 8K HDR
- Realistic lighting
- Natural textures
- Physically plausible visuals
- Subtle film grain
- Professional cinematic color grading

Avoid:

- Cartoon appearance
- Fantasy unless requested
- Random sci-fi additions
- Unrequested text
- Logos
- Watermarks
- Unrelated objects
- Visual clutter

====================================================================
SCENE CONTINUITY RULE
====================================================================

When multiple scenes use the same environment reference image:

- Preserve the same location.
- Preserve architecture.
- Preserve lighting direction unless the prompt changes time of day.
- Preserve environmental details.
- Preserve the overall visual identity.

Only change:

- camera angle
- framing
- focal subject
- action
- scene-specific objects
- people if required by the scene prompt

This ensures continuity across the documentary.

====================================================================
FAILURE HANDLING
====================================================================

If the required environment image cannot be found:

- Do NOT invent a replacement environment.
- Do NOT generate a new environment.
- Stop processing that scene.
- Report the missing environment asset name.

If image generation fails:

- Retry using the same environment reference.
- Keep the same Scene ID.
- Do not change the environment.
- Do not create duplicate scene names.

====================================================================
FINAL VERIFICATION FOR EACH BATCH
====================================================================

Before completing an iteration, verify:

[ ] All 10 scenes were processed.
[ ] Every scene used its specified existing environment reference image.
[ ] No new environment images were generated.
[ ] Scene IDs were not changed.
[ ] Generated assets are named exactly S#.
[ ] No scenes were skipped.
[ ] Scene order matches the input.
[ ] Visual continuity is preserved.

====================================================================
INPUT FORMAT
====================================================================

Paste your scene prompts below this line.

The prompts should use this structure:
`;

export const SCENE_TEMPLATE_FOOTER = `

Repeat until all scenes are included.

====================================================================
AGENT EXECUTION INSTRUCTION
====================================================================

After reading the input scene prompts:

1. Determine the total number of scenes.
2. Divide them into iterations of 10 scenes each.
3. For the current iteration:
   - Read each Scene ID.
   - Read its Environment Reference Image.
   - Locate the already-generated environment image asset.
   - Use it as the image reference/ingredient.
   - Apply the scene prompt.
   - Generate the scene image.
   - Save it using the exact Scene ID.
4. Complete all 10 scenes in the iteration.
5. Verify the batch.
6. Proceed to the next iteration when requested.

Never regenerate existing environments.
Never substitute environment references.
Never use random scene names.

====================================================================
END OF MASTER TEMPLATE
====================================================================`;
