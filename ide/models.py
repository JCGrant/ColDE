from django.db import models

class Pad(models.Model):
    title = models.CharField(max_length=100)
    text = models.TextField()
    date_created = models.DateTimeField()

    def __str__(self):
        return self.title
