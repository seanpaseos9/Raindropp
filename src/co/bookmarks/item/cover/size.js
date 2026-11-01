export default function(view, amplifier=1) {
    switch(view){
        case 'simple':
            return {
                width: 20,
                height: 20,
                ar: '1:1'
            }

        case 'grid':
        case 'masonry':
        case 'gallery':
            return {
                width: view == 'gallery' ? 280 + (amplifier * 20) : 194 + (amplifier * 30),
                ar: view == 'gallery' ? '4:5' : (view == 'grid' ? '16:9' : undefined)
            }

        default:
            return {
                width: 56,
                height: 48,
                ar: '7:6'
            }
    }
}
