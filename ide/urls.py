from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.IndexView.as_view(), name='index'),
    url(r'pad/(?P<pk>[0-9]+)$', views.PadView.as_view(), name='pad'),
]
