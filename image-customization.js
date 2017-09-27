'use strict';

var Widget = require( '../../../node_modules/enketo-core/src/js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'imageCustomizer';
var complementaryStylesheet; // one stylesheet per widget (not per instance of the widget)

/**
 * Image Map widget that turns an SVG image into a clickable map 
 * by matching radiobutton/checkbox values with id attribute values in the SVG
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */
function ImageCustomizer( element, options, event ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this.options = options;
    this._init();
}

ImageCustomizer.prototype = Object.create( Widget.prototype );
ImageCustomizer.prototype.constructor = ImageCustomizer;

ImageCustomizer.prototype._init = function() {
    var that = this;
    var observer;
    var img = this.element.querySelector( 'img' );
    this.$styleInput = this._getStyleInput();
    this.$styleInput.on( 'valuechange.enketo inputupdate.enketo', this._updateImage.bind( this ) );

    if ( $( this.element ).data( 'imageMap' ) ) {
        // Knowing that the imagemap widget will be added to DOM as sibling of .option-wrapper, 
        // observe its parent and monitor the childList.
        new MutationObserver( function( mutations ) {
            mutations.forEach( function( mutation ) {
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
                .on( 'load', function() {
                    that._addMarkup( img ).then( that._updateImage.bind( that ) );
                } );
        }
    }

};

ImageCustomizer.prototype._getStyleInput = function() {
    var input = this.element.querySelector( 'input' );
    var contextPath = this.options.helpers.input.getName( $( input ) );

    if ( this.element.dataset.imageCustomization ) {
        var targetPath = this.element.dataset.imageCustomization.trim();
        var absoluteTargetPath = this.options.helpers.pathToAbsolute( targetPath, contextPath );
        // The  code below will fail if the style node is inside a repeat (except for the first repeat instance in series)
        var $root = $( this.element ).closest( 'form.or' );
        return $root.find( '[name="' + absoluteTargetPath + '"], [data-name="' + absoluteTargetPath + '"]' ).eq( 0 );
    }
    return $();
};

ImageCustomizer.prototype._addMarkup = function( img ) {
    var that = this;
    var src = img.getAttribute( 'src' );

    /**
     * For translated forms, we now discard everything except the first image,
     * since we're assuming the images will be the same in all languages.
     */
    return $.get( src ).then( function( data ) {
        var $svg;
        var $widget;
        var width;
        var height;
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
    return this.element.querySelector( 'input[value="' + id + '"]' );
};

ImageCustomizer.prototype._isSvgDoc = function( data ) {
    return typeof data === 'object' && data.querySelector( 'svg' );
};

ImageCustomizer.prototype._complementSelectedRule = function( obj ) {
    var index;
    // TODO: add a .or-appearance-image-customization [or-selected] CSS rule at the end of the stylesheet.
    if ( !complementaryStylesheet ) {
        $( 'head' ).append( '<style/>' );
        complementaryStylesheet = document.styleSheets[ document.styleSheets.length - 1 ];
    }
    if ( complementaryStylesheet.cssRules[ 0 ] ) {
        complementaryStylesheet.deleteRule( 0 );
    }
    complementaryStylesheet.insertRule(
        '.or-appearance-image-customization .image-map svg path[id][or-selected]{' + this._getStyleValue( obj ) + '}', 0 );
};


/**
 * Updates 'selected' attributes in SVG
 * Always update the map after the value has changed in the original input elements
 */
ImageCustomizer.prototype._updateImage = function() {
    var $path;
    var id;
    var styleAttr;
    var prop;
    var that = this;
    var str = this.$styleInput.val();
    var style = JSON.parse( str );
    // We do not cache this to simplify instantiation on question that also have an imagemap-widget
    var $svg = $( this.element ).find( 'svg' );

    // Update .or-selected style
    this._complementSelectedRule( style.selected );

    // Remove custom styles
    $svg.find( 'path[id][style]' ).removeAttr( 'style' );

    if ( style && $svg.length ) {
        // If multiple values have the same id, change all of them (e.g. a province that is not contiguous)
        for ( id in style ) {
            $path = $svg.find( 'path#' + id );
            styleAttr = this._getStyleValue( style[ id ] );
            //styleAttr = $path.is( '[or-selected]' ) && style.selected ? styleAttr + this._getStyleAttrValue( style.selected ) : styleAttr;
            $path.attr( 'style', styleAttr );
        }
    }
};

ImageCustomizer.prototype._getStyleValue = function( obj ) {
    var prop;
    var value = '';
    for ( prop in obj ) {
        value += prop + ':' + obj[ prop ] + ';';
    }
    return value;
};


$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var data = $this.data( pluginName );

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new ImageCustomizer( this, options, event ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-image-customization[data-image-customization]',
    'helpersRequired': [ 'input', 'pathToAbsolute' ]
};
