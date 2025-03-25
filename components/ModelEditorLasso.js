import * as THREE from 'three';

/**
 * Handles lasso selection of vertices for a given mesh.
 */
class ModelEditorLasso {
    /**
     * @param {THREE.PerspectiveCamera | THREE.OrthographicCamera} camera - The camera used in the scene.
     * @param {HTMLElement} domElement - The canvas element used by the renderer.
     * @param {THREE.Mesh} mesh - The mesh whose vertices will be selected.
     * @param {(indices: Set<number>) => void} [onSelectionChange] - Optional callback when selection changes.
     */
    constructor(camera, domElement, mesh, onSelectionChange = () => { }) {
        this.camera = camera;
        this.domElement = domElement;
        this.mesh = mesh;
        this.selectedVertices = new Set(); // Stores indices of selected vertices
        this.onSelectionChange = onSelectionChange; // Store the callback

        this._isSelecting = false;
        this._lassoPoints = []; // Stores 2D screen coordinates of the lasso path
        this._boundOnMouseDown = this._onMouseDown.bind(this);
        this._boundOnMouseMove = this._onMouseMove.bind(this);
        this._boundOnMouseUp = this._onMouseUp.bind(this);

        this._initEventListeners();
    }

    /**
     * Initializes mouse event listeners for lasso selection.
     * @private
     */
    _initEventListeners() {
        this.domElement.addEventListener('mousedown', this._boundOnMouseDown);
        // Mouse move and up listeners are added dynamically on mousedown
    }

    /**
     * Removes event listeners. Call this when the tool is deactivated or destroyed.
     */
    dispose() {
        this.domElement.removeEventListener('mousedown', this._boundOnMouseDown);
        // Ensure move and up listeners are removed if selection was interrupted
        this.domElement.removeEventListener('mousemove', this._boundOnMouseMove);
        this.domElement.removeEventListener('mouseup', this._boundOnMouseUp);
    }

    /**
     * Handles the mouse down event to start lasso selection.
     * @param {MouseEvent} event
     * @private
     */
    _onMouseDown(event) {
        // Check if the click is relevant (e.g., left mouse button, maybe modifier keys)
        if (event.button !== 0) return; // Only react to left mouse button

        this._isSelecting = true;
        this._lassoPoints = [];
        if (this.selectedVertices.size > 0) { // Clear previous selection and notify
            this.selectedVertices.clear();
            this.onSelectionChange(this.selectedVertices); // Notify about the cleared selection
        }

        // Add move and up listeners only when dragging starts
        this.domElement.addEventListener('mousemove', this._boundOnMouseMove);
        this.domElement.addEventListener('mouseup', this._boundOnMouseUp);

        this._addLassoPoint(event);
    }

    /**
     * Handles the mouse move event to record lasso path points.
     * @param {MouseEvent} event
     * @private
     */
    _onMouseMove(event) {
        if (!this._isSelecting) return;

        this._addLassoPoint(event);
        // Optional: Add visual feedback drawing here (e.g., on a 2D overlay canvas)
    }

    /**
     * Handles the mouse up event to finalize lasso selection.
     * @param {MouseEvent} event
     * @private
     */
    _onMouseUp(event) {
        if (!this._isSelecting) return;

        this._addLassoPoint(event); // Add the final point
        this._isSelecting = false;

        // Remove dynamic listeners
        this.domElement.removeEventListener('mousemove', this._boundOnMouseMove);
        this.domElement.removeEventListener('mouseup', this._boundOnMouseUp);

        // Process the selection if we have enough points to form a polygon
        if (this._lassoPoints.length > 2) {
            this._selectVertices();
        } else {
            this._lassoPoints = []; // Not enough points, clear path
            // Ensure notification even if selection is empty after a short click/drag
            if (this.selectedVertices.size > 0) {
                this.selectedVertices.clear();
            }
        }

        // Optional: Clear visual feedback drawing here
        console.log(`Selected ${this.selectedVertices.size} vertices.`);
        // Notify the controller about the final selection
        this.onSelectionChange(this.selectedVertices); // Call the callback
    }

    /**
     * Adds a point to the lasso path based on mouse event coordinates.
     * @param {MouseEvent} event
     * @private
     */
    _addLassoPoint(event) {
        const rect = this.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this._lassoPoints.push({ x, y });
    }

    /**
     * Projects mesh vertices to screen space and checks if they are inside the lasso polygon.
     * @private
     */
    _selectVertices() {
        if (!this.mesh || !this.mesh.geometry || !this.mesh.geometry.attributes.position) {
            console.warn("Lasso Selection: Mesh or geometry position attribute not found.");
            return;
        }

        const positionAttribute = this.mesh.geometry.attributes.position;
        const vertex = new THREE.Vector3();
        const screenPos = new THREE.Vector2();
        const canvasWidth = this.domElement.clientWidth;
        const canvasHeight = this.domElement.clientHeight;

        // Pre-calculate the world matrix if needed (ensures up-to-date position)
        this.mesh.updateMatrixWorld();

        for (let i = 0; i < positionAttribute.count; i++) {
            // Get vertex position in local space
            vertex.fromBufferAttribute(positionAttribute, i);

            // Transform vertex position to world space
            vertex.applyMatrix4(this.mesh.matrixWorld);

            // Project vertex position to screen space
            const projectedVertex = vertex.clone().project(this.camera);

            // Convert normalized device coordinates (-1 to +1) to screen coordinates (0 to width/height)
            screenPos.x = Math.round(((projectedVertex.x + 1) / 2) * canvasWidth);
            screenPos.y = Math.round(((1 - projectedVertex.y) / 2) * canvasHeight); // Y is inverted

            // Check if the vertex is within the camera's view frustum (z coordinate check)
            // and if the screen position is inside the lasso polygon
            if (projectedVertex.z > -1 && projectedVertex.z < 1 && this._isPointInLasso(screenPos)) {
                this.selectedVertices.add(i);
            }
        }
    }

    /**
     * Checks if a 2D point is inside the lasso polygon using the ray casting algorithm.
     * @param {THREE.Vector2 | {x: number, y: number}} point - The point to check (screen coordinates).
     * @returns {boolean} True if the point is inside the polygon, false otherwise.
     * @private
     */
    _isPointInLasso(point) {
        let inside = false;
        const points = this._lassoPoints;
        const n = points.length;

        // Ray casting algorithm
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }

    /**
     * Returns the set of selected vertex indices.
     * @returns {Set<number>}
     */
    getSelectedVertices() {
        return this.selectedVertices;
    }
}

export default ModelEditorLasso;