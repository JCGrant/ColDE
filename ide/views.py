from django.shortcuts import render

from django.shortcuts import get_object_or_404, render
from django.views import generic

from .models import Pad

class IndexView(generic.TemplateView):
    # model = Pad
    template_name = 'ide/index.html'

class PadView(generic.DetailView):
    model = Pad
    template_name = 'ide/pad.html'
    context_object_name = 'pad'
