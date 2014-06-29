/* jquery.simpleselect
-- version 0.1.1
-- copyright 2014 UndeadBane*2014
-- licensed under the MIT
--
-- https://github.com/UndeadBaneGitHub/jquery.simpleselect
--
*/
(function ($) {
    var _SimpleSelect = function (element, source, options) {
        var _htmlToArray = function(source){
            var retArray = new Array();
            $(source).find("option").each(function(){
                retArray.push(this.innerText);
            });
            return retArray;
        }

        var _element = element instanceof $ ? element[0] : element;
        var _itemsArray = (Object.prototype.toString.call(source) === '[object Array]') ? source : _htmlToArray(source);
        var _options = {
            preserveElementMargin: false,
            wrapperMaxWidth: "css",
            wrapperMaxHeight: "css",
            wrapperWidth: "css",
            wrapperHeight: "css",
            wrapperMinWidth: "element",
            wrapperMinHeight: "element",
            itemFont: "element",
            useEscapedElementText: false,
            openEvent: "click",
            searchEvent: "keyup",
            niceScrollOptions: {
                cursorwidth: 9,
                cursoropacitymax: 0.8
            },
            emptyListItemContent: "Совпадений не найдено",
            forceValueToListValue: true,
            placeholderValue: "",
            placeholderStyle: {
                //You can put any DOM style params here - they all will be set. Or leave it blank for CSS to rule the style
                color: "lightgray"
            },
            scrollIntoViewIfNeeded: true,
            preventClosingOnSelect: false,
            doNotSelectOnClicksTo: "",
            drawArrow: true
        };
        var _arrowDiv = null;

        var self = this;

        var _itemsWrapper = null,
            _emptyListItem = null,
            _isOpen = false,
            _isAddedToDocument = false,
            _maximumNestingDepth = 1;


        // #heuristics
        // here start purely observation-based functions, that calculate,
        // how much higherarchically higher (hehe) we must place the
        // selectable so that it would not be overshadowed and get all the
        // clicks
        // help in optimizing these is greatly appreciated!
        var _getInsertionCoord = function (insertionLevel) {
            var base = _element;
            var itemsWrapperCoord = {
                top: base.offsetTop + $(base).outerHeight(),
                left: $(base).position().left
            };

            // insertion level 1 = insert to direct parent,
            // it does not need calculation, so we skip it
            for (var o = 1; o < insertionLevel; o++) {
                base = base.parentNode;
                if (/BODY|HTML/.test(base.nodeName)) {
                    break; //we have gone WAY too far
                }
                itemsWrapperCoord.top += base.offsetTop;
                itemsWrapperCoord.left += base.offsetLeft;
            }

            return itemsWrapperCoord;
        }

        var _measureElement = function (element) {
            var el = $(element).clone(false);
            el.css({ visibility: "hidden", position: "absolute" });
            el.appendTo("body");

            var retVal = { height: el.outerHeight(), width: el.outerWidth() };
            
            el.remove();

            return retVal;
        }

        var _getInsertionLevel = function(element, goUp){
            var _innerGetInsertionLevel = function (element, goUp, itemsWrapperCoordinates, currentY, lastFixedCoord, scrollableParent, limitYhasBeenReached) {
                var insertionLevel = 1;
                //$(element).scrollIntoViewIfNeeded(); //when element is visible, this heuristics works better
                var multiplier1minus1 = goUp ? -1 : 1,
                    multiplier01 = goUp ? 0 : 1,
                    multiplier10 = goUp ? 1 : 0;

                if (!itemsWrapperCoordinates) {
                    var itemsWrapperHeight = parseFloat($(_itemsWrapper).css("height") || $(_itemsWrapper).css("max-height")),
                        itemsWrapperWidth = parseFloat($(_itemsWrapper).css("width") || $(_itemsWrapper).css("max-width"));

                    if (!itemsWrapperHeight || !itemsWrapperWidth) {
                        var elMeasurements = _measureElement(_itemsWrapper);

                        itemsWrapperHeight = elMeasurements.height;
                        itemsWrapperWidth = elMeasurements.width;
                    }

                    if (!itemsWrapperHeight || !itemsWrapperWidth) {
                        return 0;
                    }

                    var _itemsWrapperCoordinates = {
                        top: $(element).offset().top + multiplier01 * $(element).outerHeight(),
                        left: $(element).offset().left,
                        bottom: $(element).offset().top + multiplier01 * $(element).outerHeight() + multiplier1minus1 * itemsWrapperHeight,
                        right: $(element).offset().left + itemsWrapperWidth
                    };
                } else {
                    _itemsWrapperCoordinates = itemsWrapperCoordinates;
                }

                if (/BODY|HTML/.test(element.nodeName)) {
                    return insertionLevel;
                }

                var elementParent = element.parentNode;
                //
                if (!$(elementParent).isScrollable() &&
                    (_itemsWrapperCoordinates.bottom > $(elementParent).offset().top + $(elementParent).height())) { //if this element is to be overflown and has hidden overflow we go higher
                    insertionLevel += _innerGetInsertionLevel(elementParent, goUp, _itemsWrapperCoordinates, _currentY, _lastFixedCoord, _scrollableParent, _limitYhasBeenReached);
                } else {
                    var iterationHeightIncrement = 10;
                    var _currentY = currentY ? currentY : _itemsWrapperCoordinates.top + multiplier1minus1 * iterationHeightIncrement,
                        currentRelativeY = _itemsWrapperCoordinates.top,
                        middleElement = null;

                    var _lastFixedCoord = lastFixedCoord || null,
                        _scrollableParent = scrollableParent || null;

                    _scrollableParent = element;

                    var _scrollableParentFound = false;
                    while (!(_scrollableParentFound = $(_scrollableParent = _scrollableParent.parentNode).isScrollable("y")) && !/HTML/.test(_scrollableParent.nodeName));
                    if (!_scrollableParentFound) {
                        return insertionLevel;
                    }

                    _lastFixedCoord = $(_scrollableParent).offset().top + multiplier01 * $(_scrollableParent).height() - multiplier1minus1 * iterationHeightIncrement;

                    var _limitYhasBeenReached = limitYhasBeenReached || false;


                    while (multiplier1minus1 * _currentY < multiplier1minus1 * _itemsWrapperCoordinates.bottom) {
                        if (multiplier1minus1 * _currentY > multiplier1minus1 * _lastFixedCoord && !_limitYhasBeenReached) {
                            $(_scrollableParent).scrollTop($(_scrollableParent).scrollTop() + (_currentY - _lastFixedCoord));
                            _limitYhasBeenReached = true;
                        }

                        middleElement = document.elementFromPoint(
                            (_itemsWrapperCoordinates.right + _itemsWrapperCoordinates.left) / 2,
                            _limitYhasBeenReached ? _lastFixedCoord : _currentY);

                        if (!middleElement) {
                            return insertionLevel;
                        }

                        if (middleElement === elementParent) {
                            _currentY += multiplier1minus1 * iterationHeightIncrement;
                            if (_limitYhasBeenReached) {
                                $(_scrollableParent).scrollTop($(_scrollableParent).scrollTop() + multiplier1minus1 * iterationHeightIncrement);
                            }
                            continue;
                        }

                        if (middleElement.parentNode === elementParent.parentNode) {
                            insertionLevel += _innerGetInsertionLevel(elementParent, goUp, _itemsWrapperCoordinates, _currentY, _lastFixedCoord, _scrollableParent, _limitYhasBeenReached);
                            break;
                        }

                        _currentY += multiplier1minus1 * iterationHeightIncrement;
                        if (_limitYhasBeenReached) {
                            $(_scrollableParent).scrollTop($(_scrollableParent).scrollTop() + multiplier1minus1 * iterationHeightIncrement);
                        }
                    }
                }
                return insertionLevel;
            }

            return _innerGetInsertionLevel(element, goUp);
        }

        this.open = function () {
            if (_isOpen) {
                return;
            }
            _removePlaceholder();

            var currentSimpleSelect = this;
            var currentItemsWrapper = this.getItemsWrapper();

            var itemsWrapperAlreadyAdded = false;

            var elementText = this.getElementText();
            $(_element).data({ oldText: elementText });

            _isAddedToDocument = currentItemsWrapper.id ? 
                $("#" + currentItemsWrapper.id).get(0) === currentItemsWrapper :
                false;

            if (!_isAddedToDocument) {
                currentItemsWrapper.id = "simple-select-items-wrapper-" + _findFreeSimpleSelectId();

                $(currentItemsWrapper).css({
                    position: "absolute",
                    maxWidth: this.getDimensionValue(_element, "max-width"),
                    width: this.getDimensionValue(_element, "width"),
                    minWidth: this.getDimensionValue(_element, "min-width"),
                    maxHeight: this.getDimensionValue(_element, "max-height"),
                    height: this.getDimensionValue(_element, "height"),
                    minHeight: this.getDimensionValue(_element, "min-height")
                });

                var insertionLevel = _getInsertionLevel(_element);
                if (!insertionLevel) {
                    throw (new Error("Failed to find insertion level!"));
                }
                var insertionElement = _element.parentNode;
                for (var o = 1; o < insertionLevel; o++) {
                    insertionElement = insertionElement.parentNode;
                }
                var itemsWrapperCoord = _getInsertionCoord(insertionLevel);

                if (_options.preserveElementMargin) {
                    var marginCompensator = parseFloat($(_element).css("margin-bottom")); //jQuery returns CALCULATED margin bottom
                    itemsWrapperCoord.top += marginCompensator;
                }

                $(currentItemsWrapper).css({ top: itemsWrapperCoord.top, left: itemsWrapperCoord.left });

                $(insertionElement).append(currentItemsWrapper);

                this.setScroll();
            } else {
                currentItemsWrapper.style.display = "";
            }

            //select and scroll element containing the text into view
            if (elementText) {
                $(currentItemsWrapper).children().each(function (event) {
                    var thisText = self.getElementText(this);
                    if (thisText === elementText) {
                        if (!$(this).hasClass("hovered")) {
                            $(this).addClass("hovered");
                        }
                        $(this).scrollIntoViewIfNeeded();
                    } else if ($(this).hasClass("hovered")) {
                        $(this).removeClass("hovered");
                    }
                });
            }

            if (_options.scrollIntoViewIfNeeded) {
                $(currentItemsWrapper).scrollIntoViewIfNeeded();
            }

            _isOpen = true;
            this.updateScroll(!_isAddedToDocument);
            
            $(_element).focus();
            _selectElementContents(_element, this.getElementText().length, this.getElementText().length);

            _setArrowUp();
            $(_element).trigger('simple-select-post-open');
        }

        this.close = function (revertToOldText) {
            if (!_isOpen) {
                return;
            }

            var textFound = false;

            var currentSimpleSelect = this;
            var currentItemsWrapper = this.getItemsWrapper();

            if (revertToOldText) {
                this.setElementText($(_element).data("oldText"));
                $(_element).trigger("simple-select-input-canceled");
            } else {
                $(_element).data("oldText", this.getElementText());
            }

            var elementText = this.getElementText();
            if (!elementText) {
                _setPlaceholder();
            }

            if (elementText) {
                $(currentItemsWrapper).children().each(function (event) {
                    var thisText = self.getElementText(this);
                    if (thisText === elementText) {
                        textFound = true;
                        if (!$(this).hasClass("hovered")) {
                            $(this).addClass("hovered");
                        }
                        $(this).scrollIntoViewIfNeeded();
                    } else if ($(this).hasClass("hovered")) {
                        $(this).removeClass("hovered");
                    }
                });
            }

            if (_options.forceValueToListValue && elementText && !textFound) {
                return;
            }
            this.getItemsWrapper().style.display = "none";
            this.updateScroll();

            _isOpen = false;
            _setArrowDown();

            $(_element).trigger('simple-select-post-close');

            if (elementText) {
                $(_element).trigger('simple-select-selected');
            }
        }

        this.search = function (text) {
            _removePlaceholder();

            var currentSimpleSelect = this;
            var currentItemsWrapper = this.getItemsWrapper();

            var elementText = text ? text : this.getElementText();

            if (($(currentItemsWrapper).children(".hovered").length) && elementText) {
                return;
            }

            $(currentItemsWrapper).children(".hovered").removeClass("hovered");

            $(currentItemsWrapper).children().each(function (event) {
                $(this).removeHighlight();
                $(this).highlight(elementText, { caseSensitive: false });

                if ((!$(this).find(".highlight").length) && elementText) {
                    this.style.display = "none";
                } else {
                    this.style.display = "";
                }
            });

            this.updateScroll();

            $(_element).trigger('simple-select-post-search');
        }

        this.isOpen = function () {
            return _isOpen;
        }

        this.getDimensionValue = function (element, dimension) {
            var optionValue = "";
            var dimensionVal = null;

            switch (dimension) {
                case "max-width":
                    optionValue = _options.wrapperMaxWidth;
                    dimensionVal = element.scrollWidth + parseFloat($(element).css("borderLeftWidth")) + parseFloat($(element).css("borderRightWidth"));
                    break;
                case "width":
                    optionValue = _options.wrapperWidth;
                    dimensionVal = element.scrollWidth + parseFloat($(element).css("borderLeftWidth")) + parseFloat($(element).css("borderRightWidth"));
                    break;
                case "min-width":
                    optionValue = _options.wrapperMinWidth;
                    dimensionVal = element.scrollWidth + parseFloat($(element).css("borderLeftWidth")) + parseFloat($(element).css("borderRightWidth"));
                    break;
                case "max-height":
                    optionValue = _options.wrapperMaxHeight;
                    dimensionVal = element.scrollHeight + parseFloat($(element).css("borderTopWidth")) + parseFloat($(element).css("borderBottomWidth"));
                    break;
                case "height":
                    optionValue = _options.wrapperHeight;
                    dimensionVal = element.scrollHeight + parseFloat($(element).css("borderTopWidth")) + parseFloat($(element).css("borderBottomWidth"));
                    break;
                case "min-height":
                    optionValue = _options.wrapperMinHeight;
                    dimensionVal = element.scrollHeight + parseFloat($(element).css("borderTopWidth")) + parseFloat($(element).css("borderBottomWidth"));
                    break;
            }

            switch (optionValue) {
                case "css":
                    return "";
                    break;
                case "element":
                    var retVal = dimensionVal ? dimensionVal : $(element).css(dimension);
                    return retVal;
                    break;
                default:
                    return optionValue;
            }
        }

        this.setItems = function (source) {
            _itemsArray = (Object.prototype.toString.call(source) === '[object Array]') ? source : _htmlToArray(source);
            _fillItemsWrapper();
            self.updateScroll();
        }

        var _fillItemsWrapper = function () {
            $(_itemsWrapper).children(".simple-select-item").not(".empty-list-item").remove();

            for (var o = 0; o < _itemsArray.length; o++) {
                var currentElement = document.createElement("div");
                currentElement.className = "simple-select-item";
                currentElement.id = "simple-select-item-" + o;
                currentElement.innerHTML = _itemsArray[o];

                if (_options.itemFont === "element") {
                    $(currentElement).css({
                        font: $(_element).css("font")
                    });
                }

                $(_itemsWrapper).append(currentElement);

                $(currentElement).click(function (event) {
                    if ($(event.target).not(_options.doNotSelectOnClicksTo).length === 0) {
                        return;
                    }
                    event.preventDefault();

                    _removePlaceholder();
                    $(this).removeHighlight();
                    var itemText = self.getElementText(this);
                    self.setElementText(itemText);
                    if (!_options.preventClosingOnSelect) {
                        self.close();
                    }

                    return false;
                });

                $(currentElement).hover(function (event) {
                    var hoveredSiblings = $(this).siblings(".hovered");
                    hoveredSiblings.toggleClass("hovered");

                    $(this).parent().data({ isHovered: true });
                });
            }
        }

        this.getItemsWrapper = function () {
            if (!_itemsWrapper) {
                _itemsWrapper = document.createElement("div");
                _itemsWrapper.className = "simple-select-items-wrapper";
                _itemsWrapper.id = null;

                _emptyListItem = document.createElement("div");
                _emptyListItem.className = "simple-select-item empty-list-item";
                _emptyListItem.id = "simple-select-item empty-list-item";
                _emptyListItem.innerHTML = _options.emptyListItemContent;
                $(_itemsWrapper).append(_emptyListItem);

                _emptyListItem.style.display = "none";

                _fillItemsWrapper();

                _maximumNestingDepth = Math.max(_maximumNestingDepth, _getMaximumDepth(_itemsWrapper));

                $(_itemsWrapper).hover(function () {
                    $(this).data({ isHovered: true });
                });
                $(_itemsWrapper).mouseout(function (event) {
                    e = event.toElement || event.relatedTarget;

                    var curLevelNode = e;

                    for (var i = 0; i < _maximumNestingDepth; i++) {
                        if (!curLevelNode) {
                            return;
                        }

                        if (curLevelNode === this) {
                            return;
                        }
                        
                        curLevelNode = curLevelNode.parentNode;
                    }

                    $(this).data({ isHovered: false });
                });
            }

            return _itemsWrapper;
        }

        this.getElementText = function (element) {
            _removePlaceholder();

            var innerElement = element ? element : _element;
            if (typeof (innerElement['simpleSelectToString']) === "function") {
                return innerElement['simpleSelectToString']();
            } else {
                return (innerElement.nodeName === "input" || innerElement.nodeName === "textarea") ? $(innerElement).val() : (_options.useEscapedElementText ? $(innerElement).html() : $(innerElement).text()).replace(/(&nbsp)/g, ' ');
            }
        }
        this.setElementText = function (newText, doNotUsePlaceholder, element) {
            var innerElement = element ? element : _element;

            if (typeof (innerElement['simpleSelectFromString']) === "function") {
                innerElement['simpleSelectFromString'](newText);
                return;
            } else {
                (innerElement.nodeName === "input" || innerElement.nodeName === "textarea") ? $(innerElement).val(newText) : (_options.useEscapedElementText ? $(innerElement).html(newText) : $(innerElement).text(newText));
            }

            if (!newText && !doNotUsePlaceholder) {
                _setPlaceholder();
            } else {//move cursor to left
                _selectElementContents(innerElement, newText.length, newText.length);
            }
        }

        this.setScroll = function () {
            currentItemsWrapper = this.getItemsWrapper();
            if (typeof ($(currentItemsWrapper).niceScroll) === "function") {
                currentItemsWrapper.style.overflowY = "hidden";
                $(currentItemsWrapper).niceScroll(_options.niceScrollOptions);
            } else {
                $(currentItemsWrapper).style.overflowY = "scroll";
            }
        }
        this.updateScroll = function (firstOpen) {
            if (!firstOpen) {
                if (typeof ($(this.getItemsWrapper()).niceScroll) === "function") {
                    if (this.isOpen()) {
                        $(this.getItemsWrapper()).getNiceScroll().show();
                        $(this.getItemsWrapper()).getNiceScroll().resize();
                    } else {
                        $(this.getItemsWrapper()).getNiceScroll().hide();
                    }
                }
            }

            if (!$(this.getItemsWrapper()).children(".simple-select-item:visible").not(".empty-list-item").length) {
                _emptyListItem.style.display = "";
            } else {
                _emptyListItem.style.display = "none";
            }
        }

        var _setPlaceholder = function (element) {
            if (!_options.placeholderValue) {
                return;
            }

            var innerElement = element ? element : _element;

            if (!self.getElementText(innerElement)) {
                $(innerElement).data("hasPlaceholder", true);

                self.setElementText(_options.placeholderValue, true/*we don't need endless cycles here*/, innerElement);
                //innerElement.style.color = _options.placeholderStyle.color;
                //innerElement.style.font = _options.placeholderStyle.font === "element" ? $(_element).css("font") : _options.placeholderStyle.font;
                //innerElement.style.textStyle = _options.placeholderStyle.textStyle;
                for (prop in _options.placeholderStyle) {
                    innerElement.style[prop] = _options.placeholderStyle[prop];
                }

                $(innerElement).focusin(_removePlaceholder);
            }
        }
        var _removePlaceholder = function (element) {
            if (!_options.placeholderValue) {
                return;
            }

            var innerElement = element ? element : _element;

            if ($(innerElement).data("hasPlaceholder")) {
                $(innerElement).data("hasPlaceholder", false);

                self.setElementText("", true, innerElement);
                //innerElement.style.color = "";
                //innerElement.style.font = "";
                //innerElement.style.textStyle = "";
                for (prop in _options.placeholderStyle) {
                    innerElement.style[prop] = "";
                }
            }
        }

        var _selectElementContents = function (el, rangeStart, rangeEnd) {
            if (!el.firstChild) { //no text
                return;
            }
            var range = document.createRange();
            //range.selectNodeContents(el);
            range.setStart(el.firstChild, rangeStart);
            range.setEnd(el.firstChild, rangeEnd);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }

        var _getMaximumDepth = function (element) {
            var child = element.firstChild;
            var childrenDepth = [];

            if (!child) {
                return 0; //text has zero nesting level - it just is
            }

            while (child) {
                childrenDepth.push(_getMaximumDepth(child));
                child = child.nextSibling;
            }

            return Math.max.apply(Math, childrenDepth) + 1;
        }

        var _findFreeSimpleSelectId = function () {
            var freeId = 0;
            while ($("#simple-select-items-wrapper-" + freeId).length) {
                freeId++;
            }
            return freeId;
        }

        var _addArrow = function () {
            if (_options.drawArrow) {
                _arrowDiv = document.createElement("div");
                _arrowDiv.className = "simple-select-arrow";
                _arrowDiv.innerText = "▼";

                $(_element).css("padding-right", "14px");
                var insertionElement = _element;
                var arrowPos = {
                    top: 0,
                    left: $(insertionElement).outerWidth() - 12
                }

                while ((($(insertionElement).css("position") !== "absolute") &&
                    ($(insertionElement).css("position") !== "relative")) &&
                    (!/BODY|HTML/.test(insertionElement.nodeName))) {
                    arrowPos.top += insertionElement.offsetTop;
                    arrowPos.left += insertionElement.offsetLeft;

                    insertionElement = insertionElement.parentNode;
                }
                $(_arrowDiv).css({

                    height: $(_element).height(),

                    top: arrowPos.top,
                    right: arrowPos.right,
                    left: arrowPos.left

                });

                $(insertionElement).append(_arrowDiv);
                var _redirectCall = function (event) {
                    event.preventDefault();
                    event.target = _element;
                    $(_element).trigger(event);
                    return false;
                }
                $(_arrowDiv).off(_options.openEvent, _redirectCall);
                $(_arrowDiv).on(_options.openEvent, _redirectCall);
            }
        }
        var _removeArrow = function () {
            if (_arrowDiv) {
                $(_arrowDiv).remove();
            }
        }
        var _setArrowDown = function () {
            if (_arrowDiv) {
                _arrowDiv.innerText = "▼";
                $(_arrowDiv).css({ top: parseFloat($(_arrowDiv).css("top")) + 1 });
            }
            //need to move it up a bit
            $(_arrowDiv).css("line-height", "");
        }
        var _setArrowUp = function () {
            if (_arrowDiv) {
                _arrowDiv.innerText = "▲";
                $(_arrowDiv).css({ top: parseFloat($(_arrowDiv).css("top"))- 1 });
            }
        }
        var _wasClickedInside = function (e) {
            if (!self.isOpen()) {
                return;
            }
            if ((!$(e.target).closest($(_element)).length) &&
                (!$(e.target).closest($(self.getItemsWrapper())).length)) {
                self.close();
            }
        }

        var _init = function () {
            if (options) {
                for (var opt in _options) {
                    if ((typeof _options[opt] != "undefined") && (typeof options[opt] != "undefined")) {
                        _options[opt] = options[opt];
                    }
                }
            }

            $(_element).off('keydown', _element_keydown);
            $(_element).on('keydown', _element_keydown);

            $(_element).off(_options.openEvent, _openEvent_happened);
            $(_element).on(_options.openEvent, _openEvent_happened);

            if (_options.searchEvent) {
                $(_element).off(_options.searchEvent, _searchEvent_happened);
                $(_element).on(_options.searchEvent, _searchEvent_happened);
            }

            $(document).off('click', _wasClickedInside);
            $(document).on('click', _wasClickedInside);

            _addArrow();

            _setPlaceholder();
        }
        this.removeSimpleSelect = function () {
            if (this.isOpen()) {
                this.close();
            }
            if (typeof ($(this.getItemsWrapper()).getNiceScroll) === "function") {
                if ($(this.getItemsWrapper()).getNiceScroll().length) {
                    $(this.getItemsWrapper()).getNiceScroll().remove();
                }
            }

            $(_element).off('keydown', _element_keydown);

            $(_element).off(_options.openEvent, _openEvent_happened);

            if (_options.searchEvent) {
                $(_element).off(_options.searchEvent, _searchEvent_happened);
            }

            $(this.getItemsWrapper()).remove();

            $(document).off('click', _wasClickedInside);

            _removeArrow();

            $(_element).data('simpleSelect', null);
        }

        _init();
    }

    var _openEvent_happened = function (event) {
        var curSimpleSelect = $(this).data('simpleSelect');

        if (!curSimpleSelect) {
            return;
        }

        if (!curSimpleSelect.isOpen()) {
            curSimpleSelect.open();
        } else {
            curSimpleSelect.close();
        }
    }
    var _searchEvent_happened = function (event) {
        $(this).data('simpleSelect').search();
    }
    var _element_keydown = function (event) {
        var currentSimpleSelect = $(this).data('simpleSelect');
        var currentItemsWrapper = currentSimpleSelect.getItemsWrapper();

        var wasOpen = currentSimpleSelect.isOpen();
        if (!wasOpen) {
            currentSimpleSelect.open();
        }

        var currentItemsWrapperChildren = $(currentItemsWrapper).children().not(".empty-list-item").not(":hidden");
        var curHovered = currentItemsWrapperChildren.siblings(".hovered").get(0) || null;

        switch (event.which) {
            case 10:
            case 13: //enter + ctrlenter
            case 27: //esc
                event.preventDefault();
                if (typeof (event.stopPropagation) === "function") {
                    event.stopPropagation();
                }

                currentSimpleSelect.close(event.which === 27);
                break;
            case 38: //up arrow
            case 40: //down arrow
                if ($(currentItemsWrapper).data("isHovered")) {
                    currentSimpleSelect.setElementText("", true);
                    
                    return false;
                }

                if (!wasOpen) {
                    return false;
                }

                event.preventDefault();
                if (typeof (event.stopPropagation) === "function") {
                    event.stopPropagation();
                }

                currentItemsWrapperChildren = $(currentItemsWrapper).children().not(".empty-list-item").not(":hidden");
                curHovered = currentItemsWrapperChildren.siblings(".hovered").get(0) || null;

                if (event.which === 38) {
                    if (curHovered) {
                        $(curHovered).removeClass("hovered")

                        curHovered = curHovered.previousSibling;//$(curHovered).prevAll(":visible").not(".empty-list-item").get(0);
                        while (curHovered && !$(curHovered).is(":visible") && !$(curHovered).is(".empty-list.item")) {
                            curHovered = curHovered.previousSibling;
                        }
                    }
                    if (!curHovered) {
                        curHovered = currentItemsWrapperChildren.last().get(0);
                    }
                } else {
                    if (curHovered) {
                        $(curHovered).removeClass("hovered")

                        curHovered = curHovered.nextSibling;//$(curHovered).nextAll(":visible").not(".empty-list-item").get(0);
                        while (curHovered && !$(curHovered).is(":visible") && !$(curHovered).is(".empty-list.item")) {
                            curHovered = curHovered.nextSibling;
                        }
                    }
                    if (!curHovered) {
                        curHovered = currentItemsWrapperChildren.first().get(0);
                    }
                }

                if (curHovered) {
                    $(curHovered).removeHighlight();
                    if (!$(curHovered).hasClass("hovered")) {
                        $(curHovered).addClass("hovered");
                    }
                    currentSimpleSelect.setElementText(currentSimpleSelect.getElementText(curHovered));

                    $(curHovered).scrollIntoViewIfNeeded();
                } else {
                    currentSimpleSelect.setElementText("");
                }

                break;
            default:
                if (curHovered) {
                    $(curHovered).removeClass("hovered");
                }
                return;
        }
    }

    $.fn.makeSimpleSelect = function (itemsArray, options) {
        return this.each(function () {
            var element = $(this);

            if (element.data('simpleSelect')) return;

            var _simpleSelect = new _SimpleSelect(this, itemsArray, options);

            element.data('simpleSelect', _simpleSelect);
        });
    }
    $.fn.removeSimpleSelect = function () {
        return this.each(function () {
            var element = $(this);
            var _SimpleSelect = element.data('simpleSelect');
            if (!_SimpleSelect) {
                return; //nothing to remove here
            }

            _SimpleSelect.removeSimpleSelect();
        });
    }

    if (typeof ($.fn.scrollIntoViewIfNeeded) !== "function") {
        $.fn.scrollIntoViewIfNeeded = function (centerItem) {
            return this.each(function () {
                if (typeof (this.scrollIntoViewIfNeeded) !== "function") {
                    var findMe = this/*document.getElementById("pleaseFindMe")*/,
                        contRect = this.parentNode.getBoundingClientRect(),
                        findMeRect = findMe.getBoundingClientRect();

                    var alignItem = null; //true - top, false - bottom, null - center
                    if ((findMeRect.top < contRect.top) && !centerItem) {
                        alignItem = true;
                    }
                    if (findMeRect.bottom > contRect.bottom && !centerItem) {
                        alignItem = false;
                    }

                    if (findMeRect.top < contRect.top || findMeRect.bottom > contRect.bottom
                           || findMeRect.right > contRect.right || findMeRect.left < contRect.left)
                        findMe.scrollIntoView(alignItem);
                } else {
                    this.scrollIntoViewIfNeeded(typeof (centerItem) === "bool" ? centerItem : null);
                }
            });
        }
    }


    //// highlight v4

    //// Highlights arbitrary terms.

    //// <http://johannburkard.de/blog/programming/javascript/highlight-javascript-text-higlighting-jquery-plugin.html>

    //// MIT license.

    //// Johann Burkard
    //// <http://johannburkard.de>
    //// <mailto:jb@eaio.com>
    if (typeof ($.fn.highlight) !== "function") {
        jQuery.fn.highlight = function (pat) {
            function innerHighlight(node, pat) {
                var skip = 0;
                if (node.nodeType == 3) {
                    var pos = node.data.toUpperCase().indexOf(pat);
                    if (pos >= 0) {
                        var spannode = document.createElement('span');
                        spannode.className = 'highlight';
                        var middlebit = node.splitText(pos);
                        var endbit = middlebit.splitText(pat.length);
                        var middleclone = middlebit.cloneNode(true);
                        spannode.appendChild(middleclone);
                        middlebit.parentNode.replaceChild(spannode, middlebit);
                        skip = 1;
                    }
                }
                else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                    for (var i = 0; i < node.childNodes.length; ++i) {
                        i += innerHighlight(node.childNodes[i], pat);
                    }
                }
                return skip;
            }
            return this.length && pat && pat.length ? this.each(function () {
                innerHighlight(this, pat.toUpperCase());
            }) : this;
        };
    }

    if (typeof ($.fn.removeHighlight) !== "function") {
        jQuery.fn.removeHighlight = function () {
            return this.find("span.highlight").each(function () {
                this.parentNode.firstChild.nodeName;
                with (this.parentNode) {
                    replaceChild(this.firstChild, this);
                    normalize();
                }
            }).end();
        };
    }

    
    $.fn.isScrollable = function (direction) {
        var retValArray = new Array();

        this.each(function (index, element) {
            var vertically_scrollable, horizontally_scrollable;
            var checkVertical = direction === "vertical" || direction === "y" || !direction,
                checkHorizontal = direction === "horizontal" || direction === "x";

            if ($(element).getNiceScroll().length) {
                if (checkHorizontal && $(element).getNiceScroll().opt.horizrailenabled) {
                    return true;
                }
                if (checkVertical) {
                    return true;
                }
            }

            if ($(element).css('overflow') == 'scroll' ||
                (($(element).css('overflowX') === 'scroll') && (checkHorizontal || !direction)) ||
                (($(element).css('overflowY') === 'scroll') && (checkVertical || !direction))) {
                retValArray.push(true);
                return;
            }

            if (checkVertical || (!direction)) {

                vertically_scrollable = (element.clientHeight < element.scrollHeight) && (
                    $.inArray($(element).css('overflowY'), ['scroll', 'auto']) !== -1 || $.inArray($(element).css('overflow'), ['scroll', 'auto']) !== -1);

                if (!direction) {
                    if (vertically_scrollable) {
                        retValArray.push(true);
                        return;
                    }
                } else {
                    retValArray.push(vertically_scrollable);
                    return;
                }
            }
            if (checkHorizontal || (!direction)) {
                horizontally_scrollable = (element.clientWidth < element.scrollWidth) && (
                $.inArray($(element).css('overflowX'), ['scroll', 'auto']) !== -1 || $.inArray($(element).css('overflow'), ['scroll', 'auto']) !== -1);
                retValArray.push(horizontally_scrollable);
            }
        });

        if (retValArray.length === 1) {
            return retValArray[0];
        } else {
            return retValArray;
        }
    }

})(jQuery);

