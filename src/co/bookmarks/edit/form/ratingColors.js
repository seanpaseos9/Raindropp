/**
 * Dynamic star-rating color palette ranging from dark red (1★) to vibrant green (5★)
 */
export function getRatingColor(score) {
    switch (parseInt(score, 10)) {
        case 1:
            return '#c62828' // Dark red
        case 2:
            return '#ef6c00' // Deep Orange
        case 3:
            return '#f9a825' // Warm Amber
        case 4:
            return '#7cb342' // Lime Green
        case 5:
            return '#2e7d32' // Vibrant Green
        default:
            return '#ffb300' // Default Gold
    }
}
