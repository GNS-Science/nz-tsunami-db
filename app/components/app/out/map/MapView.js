define([
  'jquery','underscore','backbone',
  'leaflet',
  'esri.leaflet',
  'leaflet.rrose',
  'leaflet.draw',
  './mapControl/MapControlView', './mapControl/MapControlModel',
  './mapPlot/mapPlotLat/MapPlotLatView', './mapPlot/MapPlotModel',
  'text!./map.html',
  'text!./mapPopupMultipeRecords.html',
  'text!./drawActions.html',
  'text!templates/triangleIcon.html'
], function(
  $, _, Backbone,
  leaflet,
  esriLeaflet,
  rrose,
  ldraw,
  MapControlView, MapControlModel,
  MapPlotLatView, MapPlotModel,
  template,
  templatePopupMultiple,
  templateDrawActions,
  templateTriangleIcon
){
  var MapView = Backbone.View.extend({
    events:{
      "click .layer-select" : "layerSelect",
      "mouseenter .layer-select" : "layerMouseOver",
      "mouseleave .layer-select" : "layerMouseOut",
      "click .toggle-option" : "toggleOptionClick",
      "click .nav-link" : "handleNavLink",
      "toggle-draw-options" : "toggleDrawOptions"
    },
    initialize : function(){
//      console.log('MapView.initialize')
      this.handleActive()

      // set up an empty layer group for all our overlay and basemap layers
      this.viewUpdating = false
      this.views = this.model.getViews()

      this.render()


      this.listenTo(this.model, "change:active",        this.handleActive);
      this.listenTo(this.model, "change:view",          this.handleViewUpdate);
      this.listenTo(this.model, "change:outShowRecords",this.handleViewUpdate);
      this.listenTo(this.model, "change:outShowSources",this.handleViewUpdate);
      this.listenTo(this.model, "change:outColorColumn",this.updateViews);
      this.listenTo(this.model, "change:outSourceColorColumn",this.updateViews);
      this.listenTo(this.model, "change:outPlotColumns",this.updateViews);
      this.listenTo(this.model, "change:outType",       this.updateViews);

      this.listenTo(this.model, "change:invalidateSize",this.invalidateSize);
//      this.listenTo(this.model, "change:layersUpdated",this.layersUpdated);
      this.listenTo(this.model, "change:popupLayers",this.popupLayersUpdated)

      this.listenTo(this.model, "change:selectedLayerId", this.selectedLayerUpdated);
      this.listenTo(this.model, "change:mouseOverLayerId", this.mouseOverLayerUpdated);

      this.listenTo(this.model, "change:recordsUpdated", this.recordsUpdated);
      this.listenTo(this.model, "change:sourcesUpdated", this.sourcesUpdated);
//      this.listenTo(this.model, "change:currentRecordCollection", this.updateViews);
      this.listenTo(this.model, "change:geoQuery", this.updateGeoQuery);
      this.listenTo(this.model, "change:geoQuerySources", this.updateGeoQuerySources);


    },

    render : function(){
//      console.log('MapView.render')
      this.$el.html(_.template(template)({t:this.model.getLabels()}))
      this.configureMap()
      this.updateViews()
      this.initDraw()
      // this.initDrawSources()

      return this
    },
    initDraw : function(){
      var _map = this.model.getMap()
      var labels = this.model.getLabels()
      // init draw tool
      var rectangleDrawer = new L.Draw.Rectangle(_map);
      // add draw control
      L.Control.CustomDraw = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function (map) {
          var controlDiv = L.DomUtil.create('div', 'custom-draw-toolbar leaflet-bar');
          L.DomEvent
            .addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
            .addListener(controlDiv, 'click', L.DomEvent.preventDefault)
          return controlDiv;
        }
      });
      var customDrawControl = new L.Control.CustomDraw();
      _map.addControl(customDrawControl);
      // set up draw events
      this.$('.custom-draw-toolbar').html(_.template(templateDrawActions)({t:this.model.getLabels()}));
      var that = this
      this.$('.toggle-draw-options').on(
        'click',
        function(e) {that.$el.trigger('toggle-draw-options')}
      );
      this.$('.action-filter-records').on(
        'click',
        function(e) {
          that.model.set('drawActiveType', 'records')
          rectangleDrawer.enable();
        }
      );
      this.$('.action-filter-sources').on(
        'click',
        function(e) {
          that.model.set('drawActiveType', 'sources')
          rectangleDrawer.enable();
        }
      );
      this.$('.action-cancel-draw').on(
        'click',
        function(e) {
          rectangleDrawer.disable();
          that.$el.trigger('toggle-draw-options')
        }
      );
      _map.on('draw:created', _.bind(this.onDrawCreated,this));

      // add delete control but do not yet add to map
      L.Control.CustomDelete = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function () {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-delete');
          var deleteLink = L.DomUtil.create('a', '',container);
          $(deleteLink).attr('href',"#");
          $(deleteLink).attr('title', labels.out.map.draw.clear);
          L.DomUtil.create('span', 'icon-icon_draw-reset', deleteLink);
          deleteLink.onclick = _.bind(that.queryDeleteClicked,that);
          return container;
        },
      });
      this.model.set("queryDeleteControl", new L.Control.CustomDelete())

      L.drawLocal.draw.handlers.rectangle.tooltip.start = labels.out.map.draw.start
      L.drawLocal.draw.handlers.simpleshape.tooltip.end = labels.out.map.draw.end
    },
    toggleDrawOptions: function(){
      var $el = this.$('.custom-draw-actions');
      // console.log('toggleDrawOptions')
      if ($el.hasClass('hide')){
        $el.removeClass('hide');
      } else {
        $el.addClass('hide');
      }
    },

    initMapControlView : function(){
      // console.log("MapView.initMapControlView", this.model.getShowRecords());
      var componentId = '#map-control'

      if (this.$(componentId).length > 0) {

        this.views.control = this.views.control || new MapControlView({
          el:this.$(componentId),
          model: new MapControlModel({
            labels: this.model.getLabels(),
            columnCollection:this.model.get("columnCollection"),
            sourceColumnCollection:this.model.get("sourceColumnCollection"),
            outShowRecords: this.model.getShowRecords(),
            outShowSources: this.model.getShowSources(),
            active: false
          })
        });
      }
    },
    initMapPlotLatView : function(){
      var componentId = '#map-plot-lat'

      if (this.$(componentId).length > 0) {
        var plotColumns = this.model.get("columnCollection").byAttribute("plot")
        this.views.plotLat = this.views.plotLat || new MapPlotLatView({
          el:this.$(componentId),
          model: new MapPlotModel({
            labels: this.model.getLabels(),
            columnCollection: plotColumns,
            currentRecordCollection:[],
            mouseOverLayerId : "",
            selectedLayerId : "",
            active: false,
            outPlotColumns: _.pluck(plotColumns.models,"id")
          })
        });
      }
    },
    updateMapPlotLatView:function(){
//      console.log("MapView.updateMapPlotLatView 1", Date.now() - window.timeFromUpdate);
      this.views.plotLat.model.set({outPlotColumns:
        typeof this.model.getOutPlotColumns() !== "undefined"
        ? this.model.getOutPlotColumns()
        : _.pluck(this.model.get("columnCollection").byAttribute("plot").models,"id")
      })
      if (typeof this.model.getCurrentRecords() !== "undefined") {
        var ne = this.model.getMap().getBounds().getNorthEast()//.wrap()
        var sw = this.model.getMap().getBounds().getSouthWest()//.wrap()
//        console.log("MapView.updateMapPlotLatView 2", Date.now() - window.timeFromUpdate);
        this.views.plotLat.model.setCurrentRecords(this.model.getCurrentRecords().byBounds({
          north:ne.lat,
          east:ne.lng,
          south:sw.lat,
          west:sw.lng
        }).models)
//        console.log("MapView.updateMapPlotLatView 3", Date.now() - window.timeFromUpdate);
      }
    },
    updateMapControlView:function(){
      // console.log("MapView.updateMapControlView", this.model.getOutSourceColorColumn())
      this.views.control.model.set({
        outColorColumn: this.model.getOutColorColumn(),
        outSourceColorColumn: this.model.getOutSourceColorColumn(),
        outShowRecords: this.model.getShowRecords(),
        outShowSources: this.model.getShowSources(),
      })
    },
    updateViews:function(){
//      console.log("OutView.updateOutType")

      this.$('#map-options button').removeClass('active')
      this.$('#map-options [data-option="'+this.model.getOutType()+'"]').addClass('active')

      switch(this.model.getOutType()){
        case "control":
          this.$el.removeClass('full-width')
          this.initMapControlView()
          if (this.views.plotLat) {
            this.views.plotLat.model.setActive(false)
          }
          this.views.control.model.setActive()

          this.updateMapControlView()

          break
        case "plot-lat":
          this.$el.removeClass('full-width')
          this.initMapPlotLatView()
          if (this.views.control) {
            this.views.control.model.setActive(false)
          }
          this.views.plotLat.model.setActive()
          this.updateMapPlotLatView()
          break
        default:
          this.$el.addClass('full-width')
          if (this.views.control) {
            this.views.control.model.setActive(false)
          }
          if (this.views.plotLat) {
            this.views.plotLat.model.setActive(false)
          }
          break
      }
      this.invalidateSize(true)
    },


    // map configuration has been read
    configureMap : function(){
//      console.log('MapView.configureMap')

      // set map options
      var config = this.model.getConfig()

      // initialise leaflet map
      var _map = L.map(
        config.mapID,
        config.mapOptions
      )
      .on('popupclose', _.bind(this.onPopupClose, this))
      .on('zoomstart', _.bind(this.onZoomStart, this))
      .on('movestart', _.bind(this.onMoveStart, this))
      .on('zoomend', _.bind(this.onZoomEnd, this))
      .on('moveend', _.bind(this.onMoveEnd, this))
      .on("resize",  _.debounce(_.bind(this.resize, this), 500))

      var attControl =
        L.control.attribution({position:'bottomright'})
        .setPrefix('')
        .addAttribution(config.attribution)
      _map.addControl(attControl)

      this.model.setMap(_map)

      this.initLayerGroups()

      // position map on current view
//      this.updateMapView()

//      console.log('MapView.configureMap  mapConfigured')
      this.model.mapConfigured(true)
      this.$el.trigger('mapConfigured')
    },
    checkLayers : function(){
      // console.log('checkLayers')
      var _map = this.model.getMap()
      // show/hide records layer
      if (this.model.getLayerGroup('records')) {
        if (this.model.getShowRecords() == '1') {
          this.model.getLayerGroup('records').addTo(_map)
        } else {
          this.model.getLayerGroup('records').remove()
        }
      }
      if (this.model.getLayerGroup('sources')) {
        if (this.model.getShowSources() == '1') {
          this.model.getLayerGroup('sources').addTo(_map)
        } else {
          this.model.getLayerGroup('sources').remove()
        }
      }
    },
    initLayerGroups: function (){
      // console.log('MapView.initLayerGroups')

      var _map = this.model.getMap()
      var config = this.model.getConfig()

      // init layer groups
      var queryFeatureGroup = new L.featureGroup();
      queryFeatureGroup.addTo(_map);
      var layerGroups = {
        query: queryFeatureGroup
      }
      _.each(config.layerGroups,function(conditions,id){
        var layerGroup = new L.layerGroup()
        layerGroups[id] = layerGroup
        layerGroup.addTo(_map)
      })
      this.model.setLayerGroups(layerGroups)

      // set default layer group
      _.each(this.model.getLayers().models,function(layerModel){
        layerModel.setLayerGroup(this.model.getLayerGroup("default"))
      },this)
      // set specific layer groups
      _.each(config.layerGroups,function(conditions,id){
        // console.log('initLayerGroups', id, conditions)
        if (id !== "default") {
          _.each(this.model.getLayers().where(conditions), function(layerModel){
            layerModel.setLayerGroup(this.model.getLayerGroup(id))
            if (id === "base") {
              layerModel.addToMap()
            }
          },this)
        }
      },this)

      this.checkLayers()
    },



    updateMapView : function(){
//      console.log('MapView.updateMapView ')
      var currentView = this.model.getView()
      var _map = this.model.getMap()


      // check if pre-configured view
      if (currentView !== null && typeof currentView === 'string') {
        currentView = this.model.getConfigView(currentView)
      }

      if ( currentView !== null && typeof currentView !== 'undefined' ) {

        // xyz view
        if ( typeof currentView.center !== 'undefined'
              && typeof currentView.zoom !== 'undefined'
              && typeof currentView.dimensions !== 'undefined' ){

          if (this.model.mapConfigured()){
            var zoomUpdated = this.getZoomForDimensions(currentView)

            // check if change really necessary
            if ( _map.getZoom() !== zoomUpdated
                  || this.roundDegrees(_map.getCenter().lat) !== currentView.center.lat
                  || this.roundDegrees(_map.getCenter().lng) !== currentView.center.lng) {
              _map.setView(currentView.center, zoomUpdated,{animate:true})

            }
          } else {
            // todo not sure about this one
            this.zoomToDefault()
          }


        // bounds view
        // } else if (typeof currentView.south !== 'undefined'
        //       && typeof currentView.west !== 'undefined'
        //       && typeof currentView.north !== 'undefined'
        //       && typeof currentView.east !== 'undefined') {
        //   _map.fitBounds(
        //     [
        //       [currentView.south,currentView.west],
        //       [currentView.north,currentView.east]
        //     ]
        //   )
        } else {
          this.zoomToDefault()
        }
      } else {
        this.zoomToDefault()
      }
      this.checkLayers()

      this.updateViews()
      this.triggerMapViewUpdated()

    },
    zoomToDefault:function(){
      var defaultView = this.model.getDefaultView()
      this.model.getMap().setView(defaultView.center,this.getZoomForDimensions(defaultView),{animate:true})
    },

    recordsUpdated:function(){
//      console.log('recordsUpdated')
//          console.log("MapView.recordsUpdated 1", Date.now() - window.timeFromUpdate);

      this.updateViews()
//      console.log("MapView.recordsUpdated 2", Date.now() - window.timeFromUpdate);
    },
    sourcesUpdated:function(){
//      console.log('recordsUpdated')
//          console.log("MapView.recordsUpdated 1", Date.now() - window.timeFromUpdate);

      this.updateViews()
//      console.log("MapView.recordsUpdated 2", Date.now() - window.timeFromUpdate);
    },







    // event handlers for model change events
    handleActive : function(){
      //console.log('MapView.handleActive')
      if (this.model.isActive()) {
        this.$el.show()
        var that = this
        waitFor(
          function(){
            return that.model.mapConfigured()
          },
          function(){
            that.invalidateSize(false);
          }
        )
      } else {
        this.$el.hide()
      }
    },

    handleViewUpdate : function(){
      //console.log('MapView.handleViewUpdate')
      var that = this
      // wait for config files to be read
      waitFor(
        function(){
          return that.model.mapConfigured()
        },
        function(){
          that.updateMapView()
        }
      )
    },
    mouseOverLayerUpdated:function(){
//      this.updatePopupContent()
      if (this.model.getOutType() === "plot-lat" && this.views.plotLat) {
        this.views.plotLat.model.set("mouseOverRecordId",this.model.get("mouseOverLayerId"))
      }
    },
    selectedLayerUpdated:function(){
      this.updatePopupContent()
      if (this.model.getOutType() === "plot-lat" && this.views.plotLat) {
        this.views.plotLat.model.set("selectedRecordId",this.model.get("selectedLayerId"))
      }
    },
    popupLayersUpdated:function(){
      var layers = this.model.get("popupLayers")
      // console.log("MapView.popupLayers", layers)
      var map = this.model.getMap()
      map.closePopup()
      if(layers.length > 0){
        var anchorLayer = layers[0]
        var multiple_tooltip = new L.Rrose({
          offset: anchorLayer.recordType === 'source'
            ? new L.Point(0,-12) // TODO use config instead
            : new L.Point(0,-4),
          closeButton: false,
          autoPan: false
        }).setContent(this.getMultiplesPopupContent())
          .setLatLng(anchorLayer.layer.getLayers()[0].getLatLng())
          .openOn(map)
        this.model.set("multipleTooltip",multiple_tooltip)
      }
    },

    updatePopupContent:function(){
//      console.log("MapView.selectedLayerIdChanged")
      if(typeof this.model.get("multipleTooltip") !== "undefined"
      && this.model.get("multipleTooltip") !== null){
        this.model.get("multipleTooltip").setContent(this.getMultiplesPopupContent())
      }
    },
    getMultiplesPopupContent:function(){
      var layers = this.model.get("popupLayers")
      var noNotShowing = layers.length > 20 ? layers.length - 20 : 0;
      return _.template(templatePopupMultiple)({
        layers:_.map(layers.slice(0,20), function(layer){
          var crgba = layer.color.colorToRgb()
          // TODO check config for icon rendering not recordType
          return {
            label:layer.label,
            color:layer.color,
            fillColor: 'rgba('+crgba[0]+','+crgba[1]+','+crgba[2]+',0.4)',
            id:layer.id,
            selected:this.model.get("selectedLayerId") === layer.id,
            mouseOver:this.model.get("mouseOverLayerId") === layer.id,
            icon: layer.recordType === 'source' && templateTriangleIcon && _.template(templateTriangleIcon)({
              fill: layer.color,
              color: layer.color,
            })
          }
        },this),
        noNotShowing: noNotShowing,
      })
    },

    updateGeoQuery:function(){
      var geoQuery = this.model.get("geoQuery")
      var queryLayer = this.model.get("queryLayer")
      var deleteControl = this.model.get("queryDeleteControl")
      var layerGroup = this.model.getLayerGroups()["query"]
      var _map = this.model.getMap()

      // remove layer from map
      if (typeof queryLayer !== "undefined") {
        if (layerGroup.hasLayer(queryLayer)){
          layerGroup.removeLayer(queryLayer)
        }
      }
      if (typeof deleteControl !== "undefined") {
          deleteControl.remove()
      }

      // add layer from map if at least one boundary defined
      if (typeof geoQuery !== "undefined") {
        // have at least one undefined
        if (typeof geoQuery.north !== "undefined"
        || typeof geoQuery.south !== "undefined"
        || typeof geoQuery.west !== "undefined"
        || typeof geoQuery.east !== "undefined" ) {


          queryLayer = L.rectangle(
            L.latLngBounds(
              L.latLng(
                typeof geoQuery.south !== "undefined" ? parseFloat(geoQuery.south) : -90,
                typeof geoQuery.west !== "undefined"
                  ? geoQuery.west < 0
                    ? parseFloat(geoQuery.west) + 360
                    : parseFloat(geoQuery.west)
                  : 0
              ),
              L.latLng(
                typeof geoQuery.north !== "undefined" ? parseFloat(geoQuery.north) : 90,
                typeof geoQuery.east !== "undefined"
                    ? geoQuery.east < 0
                      ? parseFloat(geoQuery.east) + 360
                      : parseFloat(geoQuery.east)
                    : 360
              )
            ),
            this.model.getConfig().layerStyles.query
          )

          layerGroup.addLayer(queryLayer)
          queryLayer.bringToBack()
          this.model.set("queryLayer",queryLayer)
          _map.addControl(deleteControl)
          _map.fitBounds(
            layerGroup.getBounds(),
            {
              padding: [ 20, 20 ]
            }
          )
        }
      }

    },
    updateGeoQuerySources:function(){
      var geoQuery = this.model.get("geoQuerySources")
      var queryLayer = this.model.get("queryLayerSources")
      var deleteControl = this.model.get("queryDeleteControl")
      var layerGroup = this.model.getLayerGroups()["query"]
      var _map = this.model.getMap()

      // remove layer from map
      if (typeof queryLayer !== "undefined") {
        if (layerGroup.hasLayer(queryLayer)){
          layerGroup.removeLayer(queryLayer)
        }
      }
      // if (typeof deleteControl !== "undefined") {
      //     deleteControl.remove()
      // }

      // add layer from map if at least one boundary defined
      if (typeof geoQuery !== "undefined") {
        // have at least one undefined
        if (typeof geoQuery.north !== "undefined"
        || typeof geoQuery.south !== "undefined"
        || typeof geoQuery.west !== "undefined"
        || typeof geoQuery.east !== "undefined" ) {


          queryLayer = L.rectangle(
            L.latLngBounds(
              L.latLng(
                typeof geoQuery.south !== "undefined" ? parseFloat(geoQuery.south) : -90,
                typeof geoQuery.west !== "undefined"
                  ? geoQuery.west < 0
                    ? parseFloat(geoQuery.west) + 360
                    : parseFloat(geoQuery.west)
                  : 0
              ),
              L.latLng(
                typeof geoQuery.north !== "undefined" ? parseFloat(geoQuery.north) : 90,
                typeof geoQuery.east !== "undefined"
                    ? geoQuery.east < 0
                      ? parseFloat(geoQuery.east) + 360
                      : parseFloat(geoQuery.east)
                    : 360
              )
            ),
            this.model.getConfig().layerStyles.querySources
          )

          layerGroup.addLayer(queryLayer)
          queryLayer.bringToBack()
          this.model.set("queryLayerSources",queryLayer)

          _map.addControl(deleteControl)
          _map.fitBounds(
            layerGroup.getBounds(),
            {
              padding: [ 20, 20 ]
            }
          )
        }
      }

    },
















    // event Handlers for view events
    resize : function (){
      //console.log('MapView.resize')
      this.updateMapView()
    },

//    layersUpdated : function (){
//      var _map = this.model.getMap()
//
//
//
//    },
    invalidateSize : function (animate){
      animate = typeof animate !== 'undefined' ? animate : false
      //console.log('MapView.invalidateSize')
      if (typeof this.model.getMap() !== 'undefined' ) {
        this.model.getMap().invalidateSize(animate)
      }
    },


    onPopupClose:function(e){
//      console.log("MapView.onPopupClose")
      this.model.set("multipleTooltip",null)
      this.$el.trigger('mapPopupClosed')


    },

    onZoomStart : function(e) {
//      console.log('MapView.onZoomStart')
      // make sure map state really changed
      this.zooming = true

    },
    onMoveStart : function(e) {
      //console.log('MapView.onMoveStart')
      this.moving = true
    },
    onZoomEnd : function(e) {
//      console.log('MapView.onZoomEnd')
      this.zooming = false
      this.triggerMapViewUpdated()

    },
    onMoveEnd : function(e) {
      //console.log('MapView.onMoveEnd')
      this.moving = false
      this.triggerMapViewUpdated()
    },

    // event triggers (upstream)
    triggerMapViewUpdated : function() {

      //console.log('MapView.triggerMapViewUpdated ')
      var _map = this.model.getMap()
      // make sure only one event gets broadcasted
      // when map is moved and zoomed at the same time
      if (!this.viewUpdating) {
        var that = this
        this.viewUpdating = true
        waitFor(
          function(){
            return that.model.mapConfigured() && that.model.getView()!== null
          },
          function(){
            that.viewUpdating = false
            var view = that.model.getView()
            if (typeof view !== 'undefined'
              && (view.zoom !== _map.getZoom()
              || view.center.lat !== that.roundDegrees(_map.getCenter().lat)
              || view.center.lng !== that.roundDegrees(_map.getCenter().lng)
              || !_.isEqual(view.dimensions, that.getDimensions()))) {
              that.$el.trigger('mapViewUpdated',{
                view: {
                  zoom : _map.getZoom(),
                  center : {
                    lat:that.roundDegrees(_map.getCenter().lat),
                    lng:that.roundDegrees(_map.getCenter().lng)
                  },
                  dimensions : that.getDimensions()
                }
              })
            }
          }
        )
      }
    },



    queryDeleteClicked:function(e){
      e.preventDefault()
      this.$el.trigger('geoQueryDelete')
      this.$el.trigger('geoQuerySourcesDelete')
    },

    layerSelect:function(e){
      // console.log("MapView.layerSelect")

      e.preventDefault()
      this.$el.trigger('mapLayerSelect',{
        id: $(e.currentTarget).attr("data-layerid")
      })
    },

    layerMouseOver:function(e){
      e.preventDefault()
      this.$el.trigger('mapLayerMouseOver',{id:$(e.currentTarget).attr("data-layerid")})
    },
    layerMouseOut:function(e){
      e.preventDefault()
      this.$el.trigger('mapLayerMouseOut',{id:$(e.currentTarget).attr("data-layerid")})
    },

    toggleOptionClick:function(e){
      e.preventDefault()

      this.$el.trigger('mapOptionToggled',{
        option: $(e.currentTarget).attr("data-option")
      })
    },
    toggleShowRecordsClick:function(e){
      e.preventDefault()

      this.$el.trigger('mapShowRecordsToggled',{
        option: $(e.currentTarget).attr("data-option")
      })
    },
    toggleShowSourcesClick:function(e){
      e.preventDefault()

      this.$el.trigger('mapShowSourcesToggled',{
        option: $(e.currentTarget).attr("data-option")
      })
    },



    onDrawStart : function(e) {
      var map = this.model.getMap()
      map.closePopup()
      $(map.getPane("popupPane")).hide()

    },
    onDrawCreated : function(e) {
      var map = this.model.getMap()
      var drawActiveType = this.model.get('drawActiveType')
      map.closePopup()
      $(map.getPane("popupPane")).show()
      this.$el.trigger(drawActiveType === 'sources'
        ? 'geoQuerySourcesSubmit'
        : 'geoQuerySubmit',
        {
          geoQuery: {
            north:this.roundDegrees(e.layer.getBounds().getNorth()),
            south:this.roundDegrees(e.layer.getBounds().getSouth()),
            west:this.roundDegrees(e.layer.getBounds().getWest()),
            east:this.roundDegrees(e.layer.getBounds().getEast())
          }
        }
      )
      var layerGroup = this.model.getLayerGroups()["query"]
      // zoom to query group
      map.fitBounds(
        layerGroup.getBounds(),
        {
          padding: [ 20, 20 ]
        }
      )
    },

    handleNavLink : function(e){
      e.preventDefault()
      e.stopPropagation()

      var id = $(e.target).data('id')
      var route = $(e.target).data('route')
      var type = $(e.target).data('type')

      this.$el.trigger('navLink',{
        target:e.target,
        id:id,
        route:route,
        type:type
      })
    },





    // UTILS
    getDimensions : function() {
      return [this.$el.innerWidth(),this.$el.innerHeight()]
    },
    // figure out best zoom for dimensions
    getZoomOffset : function(view) {

      var dimActual = this.getDimensions()
      var dim = [view.dimensions[0], view.dimensions[1]]

      var factor = 1
      var offset = 0
      var zoomed = 1

      // if actual dimensions wider > scale height
      if (dimActual[0]/dimActual[1] > dim[0]/dim[1]){
        factor = dimActual[1]/dim[1]
      } else {
        factor = dimActual[0]/dim[0]
      }

      // factor 1 >> no zoom level change for factor 1
      if (factor === 1) {
        return offset

      // factor > 1  >> test higher zoom levels
      } else if (factor > 1) {

        while (zoomed*1.9 < factor) {
          zoomed = zoomed*2
          offset++
        }

      // factor < 1  >> test lower zoom levels
      } else {

        var offset = 0
        var zoomed = 1

        while (zoomed > factor) {
          zoomed = zoomed/2
          offset--
        }
      }
      return offset
    },
    getZoomForDimensions : function(view) {
      var _map = this.model.getMap()
      return Math.max(
        Math.min(
          view.zoom + this.getZoomOffset(view),
          _map.getMaxZoom()
        ),
        _map.getMinZoom()
      )

    },
    setZoomClass : function(){
      // remove previous zoom class
      this.$el.removeClass (function (index, classes) {
        return (classes.match (/\bzoom-level-\S+/g) || []).join(' ');
      });
      // set new zoom class
      this.$el.addClass('zoom-level-' + this.model.getZoom());
    },
    roundDegrees : function(value){
      //round to 4 decimals
      return Math.round(value * 10000) / 10000
    }



  });

  return MapView;

});
