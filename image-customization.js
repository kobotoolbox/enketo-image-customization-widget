import Widget from 'enketo-core/src/js/widget';
import $ from 'jquery';

let complementaryStylesheet; // one stylesheet per widget (not per instance of the widget)

/**
 * Image Map widget that turns an SVG image into a clickable map 
 * by matching radiobutton/checkbox values with id attribute values in the SVG
 */
class ImageCustomizer extends Widget {

    static get selector() {
        return '.or-appearance-image-customization[data-image-customization]';
    }

    static get helpersRequired() {
        return [ 'input', 'pathToAbsolute' ];
    }

}

// TODO: move these methods inside the class statement.
// TODO: make this widget compliant with the new Enketo Core widget format and run the common tests.

ImageCustomizer.prototype._init = function() {
    const that = this;
    const img = this.element.querySelector( 'img' );
    this.$styleInput = this._getStyleInput();
    this.$styleInput.on( 'valuechange.enketo inputupdate.enketo', this._updateImage.bind( this ) );

    if ( this.element.classList.contains( 'or-image-map-initialized' ) ) {
        // Knowing that the imagemap widget will be added to DOM as sibling of .option-wrapper, 
        // observe its parent and monitor the childList.
        new MutationObserver( mutations => {
            mutations.forEach( mutation => {
                if ( mutation.addedNodes[ 0 ].classList.contains( 'image-map' ) ) {
                    that._updateImage();
                }
            } );
        } ).observe( that.element.querySelector( '.option-wrapper' ).parentElement, {
            childList: true
        } );
        return;
    }

    /*
     * To facilitate Enketo Express' offline webforms,
     * where the img source is populated after form loading, we initialize upon image load
     * if the src attribute is not yet populated.
     *
     * We could use the same with online-only forms, but that would cause a loading delay.
     */
    if ( this.$styleInput && this.$styleInput.length && img ) {
        if ( img.getAttribute( 'src' ) ) {
            this._addMarkup( img ).then( this._updateImage.bind( this ) );
        } else {
            $( img )
                .on( 'load', () => {
                    that._addMarkup( img ).then( that._updateImage.bind( that ) );
                } );
        }
    }

};

ImageCustomizer.prototype._getStyleInput = function() {
    const input = this.element.querySelector( 'input' );
    const contextPath = this.options.helpers.input.getName( $( input ) );

    if ( this.element.dataset.imageCustomization ) {
        const targetPath = this.element.dataset.imageCustomization.trim();
        const absoluteTargetPath = this.options.helpers.pathToAbsolute( targetPath, contextPath );
        // The  code below will fail if the style node is inside a repeat (except for the first repeat instance in series)
        const $root = $( this.element ).closest( 'form.or' );
        return $root.find( `[name="${absoluteTargetPath}"], [data-name="${absoluteTargetPath}"]` ).eq( 0 );
    }
    return $();
};

ImageCustomizer.prototype._addMarkup = function( img ) {
    const that = this;
    const src = img.getAttribute( 'src' );

    /**
     * For translated forms, we now discard everything except the first image,
     * since we're assuming the images will be the same in all languages.
     */
    return $.get( src ).then( data => {
        let $svg;
        let $widget;
        let width;
        let height;
        if ( that._isSvgDoc( data ) ) {
            $svg = $( data.querySelector( 'svg' ) );
            $widget = $( '<div class="widget image-map"/>' ).append( $svg );
            // remove images in all languages
            $( that.element ).find( 'img' ).remove();
            $( that.element ).append( $widget );
            // Resize, using original unscaled SVG dimensions
            // svg.getBBox() only works after SVG has been added to DOM.
            width = $svg.attr( 'width' ) || $svg[ 0 ].getBBox().width;
            height = $svg.attr( 'height' ) || $svg[ 0 ].getBBox().height;
            $svg.attr( 'viewBox', [ 0, 0, width, height ].join( ' ' ) );

            return $widget;
        }
    } );
};

ImageCustomizer.prototype._getInput = function( id ) {
    return this.element.querySelector( `input[value="${id}"]` );
};

ImageCustomizer.prototype._isSvgDoc = data => typeof data === 'object' && data.querySelector( 'svg' );

ImageCustomizer.prototype._complementSelectedRule = function( obj ) {
    // TODO: add a .or-appearance-image-customization [or-selected] CSS rule at the end of the stylesheet.
    if ( !complementaryStylesheet ) {
        $( 'head' ).append( '<style/>' );
        complementaryStylesheet = document.styleSheets[ document.styleSheets.length - 1 ];
    }
    if ( complementaryStylesheet.cssRules[ 0 ] ) {
        complementaryStylesheet.deleteRule( 0 );
    }
    complementaryStylesheet.insertRule(
        `.or-appearance-image-customization .image-map svg path[id][or-selected]{${this._getStyleValue(obj)}}`, 0 );
};

/**
 * Updates 'selected' attributes in SVG
 * Always update the map after the value has changed in the original input elements
 */
ImageCustomizer.prototype._updateImage = function() {
    let $path;
    let id;
    let styleAttr;
    const str = this.$styleInput.val();
    const style = JSON.parse( str );
    // We do not cache this to simplify instantiation on question that also have an imagemap-widget
    const $svg = $( this.element ).find( 'svg' );

    // Update .or-selected style
    this._complementSelectedRule( style.selected );

    // Remove custom styles
    $svg.find( 'path[id][style]' ).removeAttr( 'style' );

    if ( style && $svg.length ) {
        // If multiple values have the same id, change all of them (e.g. a province that is not contiguous)
        for ( id in style ) {
            $path = $svg.find( `path#${id}` );
            styleAttr = this._getStyleValue( style[ id ] );
            //styleAttr = $path.is( '[or-selected]' ) && style.selected ? styleAttr + this._getStyleAttrValue( style.selected ) : styleAttr;
            $path.attr( 'style', styleAttr );
        }
    }
};

ImageCustomizer.prototype._getStyleValue = obj => {
    let prop;
    let value = '';
    for ( prop in obj ) {
        value += `${prop}:${obj[prop]} !important;`;
    }
    return value;
};

export default ImageCustomizer;
